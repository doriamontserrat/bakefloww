const Product = require('../models/Product.model');

// Único punto donde se mueve el stock. Operaciones atómicas ($inc con condición) para que dos
// ventas simultáneas no puedan dejar el stock en negativo.

// lines: [{ productId, quantity, name }]. Descuenta todo o nada.
// Devuelve { ok: true } o { ok: false, name, stock } con el primer producto que no alcanzó.
async function deductStock(lines) {
  const done = [];
  for (const line of lines) {
    const updated = await Product.findOneAndUpdate(
      { _id: line.productId, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } },
      { new: true }
    );
    if (!updated) {
      await restoreStock(done);
      const current = await Product.findById(line.productId).select('name stock');
      return { ok: false, name: current?.name || line.name, stock: current?.stock ?? 0 };
    }
    done.push(line);
    if (updated.stock <= 0) await Product.updateOne({ _id: updated._id }, { isAvailable: false });
  }
  return { ok: true };
}

// Devuelve el stock de unas líneas (pedido cancelado/rechazado/eliminado). Ignora productos ya borrados.
async function restoreStock(lines) {
  for (const line of lines) {
    if (!line.productId) continue;
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } });
    await Product.updateOne({ _id: line.productId, stock: { $gt: 0 }, isAvailable: false }, { isAvailable: true });
  }
}

module.exports = { deductStock, restoreStock };
