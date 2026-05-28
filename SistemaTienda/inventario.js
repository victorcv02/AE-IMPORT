// --- MÓDULO DE INVENTARIO ---
function listarProductosInventario() {
    const tbody = document.getElementById('tabla-inventario');
    const busqueda = document.getElementById('buscar-producto-inv').value.toLowerCase();
    const filtroCat = document.getElementById('filtro-categoria').value;
    tbody.innerHTML = '';

    const productosFiltrados = productos.filter(p => {
        const coincideNombre = p.nombre.toLowerCase().includes(busqueda);
        const coincideCategoria = (filtroCat === 'Todos') || (p.categoria === filtroCat);
        return coincideNombre && coincideCategoria;
    });

    if(productosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5 text-slate-400">No hay productos que coincidan con los filtros.</td></tr>`;
        return;
    }

    productosFiltrados.forEach(p => {
        const esCritico = p.stock <= p.minimo;
        const badge = esCritico 
            ? `<span class="px-2 py-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">Por reponer</span>`
            : `<span class="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Ok</span>`;
        
        const infoMayorista = (p.precioMayor && p.cantMayor) 
            ? `<span class="text-indigo-600 font-bold">S/ ${p.precioMayor.toFixed(2)}</span> <span class="text-[11px] text-slate-400">(x${p.cantMayor})</span>`
            : `<span class="text-slate-300">—</span>`;

        // Modificado: Ahora p.categoria va como texto plano sin cajas ni bordes
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-5 py-3 font-semibold text-slate-700">${p.nombre}</td>
                <td class="px-5 py-3 text-slate-500 font-medium">${p.categoria}</td>
                <td class="px-5 py-3 text-right font-medium text-slate-600">S/ ${p.precio.toFixed(2)}</td>
                <td class="px-5 py-3 text-right">${infoMayorista}</td>
                <td class="px-5 py-3 text-center font-bold ${esCritico ? 'text-rose-600' : 'text-slate-600'}">${p.stock}</td>
                <td class="px-5 py-3 text-center">${badge}</td>
                <td class="px-5 py-3 text-center space-x-1">
                    <button onclick="editarProducto('${p.id}')" class="text-indigo-600 hover:text-indigo-900 font-medium text-xs bg-indigo-50 px-2 py-1 rounded">Editar</button>
                    <button onclick="eliminarProducto('${p.id}')" class="text-rose-600 hover:text-rose-900 font-medium text-xs bg-rose-50 px-2 py-1 rounded">Borrar</button>
                </td>
            </tr>
        `;
    });
}
        
async function guardarProducto(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value || Date.now().toString();
    const nombre = document.getElementById('prod-nombre').value.trim();
    const categoria = document.getElementById('prod-categoria').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    const minimo = parseInt(document.getElementById('prod-minimo').value);
    
    const precioMayorVal = document.getElementById('prod-precio-mayor').value;
    const cantMayorVal = document.getElementById('prod-cant-mayor').value;
    const precio_mayor = precioMayorVal ? parseFloat(precioMayorVal) : null;
    const cant_mayor = cantMayorVal ? parseInt(cantMayorVal) : null;

    const { error } = await _supabase.from('productos').upsert({
        id, nombre, categoria, precio, stock, minimo, precio_mayor, cant_mayor
    });
    if (error) { alert('Error: ' + error.message); return; }

    await descargarTodoDeLaNube();
    listarProductosInventario();
    limpiarFormProducto();
    alert('¡Producto guardado en la nube con su categoría!');
}

function editarProducto(id) {
    const p = productos.find(prod => prod.id === id);
    if(!p) return;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-categoria').value = p.categoria || 'Sin categoría';
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-minimo').value = p.minimo;
    document.getElementById('prod-precio-mayor').value = p.precioMayor || '';
    document.getElementById('prod-cant-mayor').value = p.cantMayor || '';
}

async function eliminarProducto(id) {
    if(confirm('¿Seguro que deseas borrar este producto de la nube?')) {
        const { error } = await _supabase.from('productos').delete().eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        await descargarTodoDeLaNube();
        listarProductosInventario();
    }
}

function limpiarFormProducto() {
    document.getElementById('prod-id').value = '';
    document.getElementById('form-producto').reset();
    document.getElementById('prod-categoria').value = 'Sin categoría';
}