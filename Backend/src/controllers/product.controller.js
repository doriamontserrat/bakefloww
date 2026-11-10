const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Category = require('../models/Category.model');
const v = require('../utils/validators');
const { pick, canAccessBakery, forbidden, notFound, isCastError } = require('../utils/access');

// Valida los campos de producto presentes en `data` (en la creación se exige todo).
async function validateProduct(data, bakeryId, creating) {
  const need = (key) => creating || key in data;
  const text = (x) => (typeof x === 'string' ? x.trim() : '');
  if (need('name')) {
    const m = v.validateTitle(data.name, 'El nombre del producto', 2, 80);
    if (m) return m;
  }
  if (need('price')) {
    const m = v.validatePrice(data.price, 'El precio');
    if (m) return m;
  }
  if (need('imageUrl') && !text(data.imageUrl)) return 'La imagen del producto es obligatoria.';
  if (need('description')) {
    const d = text(data.description);
    if (d.length < 10) return 'La descripción es obligatoria (mínimo 10 caracteres).';
    if (d.length > 500) return 'La descripción no puede superar 500 caracteres.';
  }
  if (need('categoryId')) {
    if (!data.categoryId) return 'Selecciona una categoría.';
    const cat = await Category.findById(data.categoryId).catch(() => null);
    if (!cat || (cat.bakeryId && String(cat.bakeryId) !== String(bakeryId))) return 'La categoría seleccionada no es válida.';
  }
  if ('stock' in data && (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)) return 'El stock debe ser un número entero mayor o igual a 0.';
  return '';
}

const PRODUCT_FIELDS = ['categoryId', 'name', 'description', 'price', 'imageUrl', 'sizes', 'flavors', 'stock', 'isAvailable'];

exports.getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.bakeryId) filter.bakeryId = req.query.bakeryId;
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;

    const products = await Product.find(filter)
      .populate('bakeryId', 'name')
      .populate('categoryId', 'name');
    res.json({ ok: true, products });
  } catch (error) {
    if (isCastError(error)) return res.status(400).json({ ok: false, message: 'Filtro inválido' });
    res.status(500).json({ ok: false, message: 'Error al obtener el menú de pasteles' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    // Una pastelería solo crea en la suya; el admin debe indicar cuál
    const bakeryId = req.user.role === 'admin' ? req.body.bakeryId : req.user.bakeryId;
    if (!bakeryId) {
      return res.status(400).json({ ok: false, message: 'No hay pastelería asociada para crear el producto.' });
    }
    const data = pick(req.body, PRODUCT_FIELDS);
    const invalid = await validateProduct(data, bakeryId, true);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    const product = await Product.create({ ...data, bakeryId });
    res.status(201).json({ ok: true, message: 'Pastel agregado al menú', product });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear producto', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return notFound(res, 'Producto no encontrado');
    if (!canAccessBakery(req.user, product.bakeryId)) return forbidden(res);

    const data = pick(req.body, PRODUCT_FIELDS);
    const invalid = await validateProduct(data, product.bakeryId, false);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    const wasOutOfStock = product.stock <= 0;
    product.set(data);
    // Al reponer un producto agotado vuelve a estar disponible (salvo que se indique lo contrario)
    if (wasOutOfStock && product.stock > 0 && data.isAvailable === undefined) product.isAvailable = true;
    await product.save();
    res.json({ ok: true, message: 'Pastel actualizado', product });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar producto', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return notFound(res, 'Producto no encontrado');
    if (!canAccessBakery(req.user, product.bakeryId)) return forbidden(res);

    await product.deleteOne();
    res.json({ ok: true, message: 'Pastel eliminado del menú' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar producto' });
  }
};

// Más pedidos (por unidades vendidas en pedidos no cancelados). Si aún no hay ventas, devuelve los más recientes.
exports.getPopularProducts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const ranking = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'rejected', 'declined'] }, orderType: 'standard' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', sold: { $sum: '$items.quantity' } } },
      { $sort: { sold: -1 } },
      { $limit: 50 }
    ]);
    const soldById = Object.fromEntries(ranking.map((r) => [String(r._id), r.sold]));
    let products = await Product.find({ _id: { $in: ranking.map((r) => r._id) }, isAvailable: true })
      .populate('bakeryId', 'name').populate('categoryId', 'name');
    products = products.sort((a, b) => soldById[String(b._id)] - soldById[String(a._id)]).slice(0, limit);

    if (products.length < limit) {
      const extra = await Product.find({ isAvailable: true, _id: { $nin: products.map((p) => p._id) } })
        .sort({ createdAt: -1 }).limit(limit - products.length)
        .populate('bakeryId', 'name').populate('categoryId', 'name');
      products = products.concat(extra);
    }
    res.json({ ok: true, products: products.map((p) => ({ ...p.toObject(), sold: soldById[String(p._id)] || 0 })) });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener los productos populares' });
  }
};
