const Category = require('../models/Category.model');
const Product = require('../models/Product.model');
const { pick, notFound } = require('../utils/access');

const CATEGORY_FIELDS = ['name', 'description', 'icon', 'isActive'];

exports.getCategories = async (req, res) => {
  try {
    const [list, counts] = await Promise.all([
      Category.find().sort({ createdAt: 1 }),
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
    const category = await Category.create(pick(req.body, CATEGORY_FIELDS));
    res.status(201).json({ ok: true, message: 'Categoría creada', category });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear categoría', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, pick(req.body, CATEGORY_FIELDS), {
      new: true,
      runValidators: true
    });
    if (!category) return notFound(res, 'Categoría no encontrada');
    res.json({ ok: true, message: 'Categoría actualizada', category });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar categoría' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return notFound(res, 'Categoría no encontrada');
    await Product.updateMany({ categoryId: category._id }, { categoryId: null });
    res.json({ ok: true, message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar categoría' });
  }
};
