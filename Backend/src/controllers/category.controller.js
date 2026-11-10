const Category = require('../models/Category.model');
const Product = require('../models/Product.model');
const v = require('../utils/validators');
const { pick, notFound, forbidden, canAccessBakery } = require('../utils/access');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CATEGORY_FIELDS = ['name', 'description', 'icon', 'isActive'];

// Pastelería/empleado: las categorías de su pastelería (+ las globales históricas). Resto: ?bakeryId= opcional.
exports.getCategories = async (req, res) => {
  try {
    const bakeryId = ['bakery', 'employee'].includes(req.user?.role) ? req.user.bakeryId : req.query.bakeryId;
    const filter = bakeryId ? { $or: [{ bakeryId }, { bakeryId: null }] } : {};
    const [list, counts] = await Promise.all([
      Category.find(filter).sort({ createdAt: 1 }),
      Product.aggregate([{ $group: { _id: '$categoryId', n: { $sum: 1 } } }])
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    const categories = list.map((c) => ({ ...c.toObject(), productsCount: byId[String(c._id)] || 0 }));
    res.json({ ok: true, categories });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener categorías' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    if (!req.user.bakeryId) return res.status(400).json({ ok: false, message: 'No hay pastelería asociada.' });
    const data = pick(req.body, CATEGORY_FIELDS);
    const invalid = v.validateTitle(data.name, 'El nombre de la categoría', 2, 30);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    data.name = data.name.trim();
    const exists = await Category.findOne({ bakeryId: req.user.bakeryId, name: new RegExp('^' + escapeRegex(data.name) + '$', 'i') });
    if (exists) return res.status(400).json({ ok: false, message: 'Ya tienes una categoría con ese nombre.' });
    const category = await Category.create({ ...data, bakeryId: req.user.bakeryId });
    res.status(201).json({ ok: true, message: 'Categoría creada', category });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.code === 11000 ? 'Ya tienes una categoría con ese nombre.' : 'Error al crear categoría' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return notFound(res, 'Categoría no encontrada');
    if (!category.bakeryId || !canAccessBakery(req.user, category.bakeryId)) return forbidden(res);
    const data = pick(req.body, CATEGORY_FIELDS);
    if ('name' in data) {
      const invalid = v.validateTitle(data.name, 'El nombre de la categoría', 2, 30);
      if (invalid) return res.status(400).json({ ok: false, message: invalid });
    }
    category.set(data);
    await category.save();
    res.json({ ok: true, message: 'Categoría actualizada', category });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar categoría' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return notFound(res, 'Categoría no encontrada');
    if (!category.bakeryId || !canAccessBakery(req.user, category.bakeryId)) return forbidden(res);
    await category.deleteOne();
    await Product.updateMany({ categoryId: category._id }, { categoryId: null });
    res.json({ ok: true, message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar categoría' });
  }
};
