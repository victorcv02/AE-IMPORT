// --- MÓDULO DE VENTAS (CARRITO Y REGISTRO) ---
function filtrarProductosVenta() {
    const busqueda = document.getElementById('buscar-venta').value.toLowerCase();
    const select = document.getElementById('select-producto-venta');
    select.innerHTML = '';

    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda));

    if(filtrados.length === 0) {
        select.innerHTML = `<option value="">❌ No se encontraron productos</option>`;
        return;
    }

    filtrados.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.nombre} (Stock: ${p.stock} | S/ ${p.precio.toFixed(2)})</option>`;
    });
}

function agregarAlCarrito() {
    const idProd = document.getElementById('select-producto-venta').value;
    const cantidad = parseInt(document.getElementById('venta-cantidad').value);

    if(!idProd) { alert("Selecciona un producto válido."); return; }
    if(isNaN(cantidad) || cantidad <= 0) { alert("Ingresa una cantidad correcta."); return; }

    const prod = productos.find(p => p.id === idProd);
    if(!prod) return;

    if(cantidad > prod.stock) {
        alert(`Stock insuficiente. Solo quedan ${prod.stock} unidades de ${prod.nombre}.`);
        return;
    }

    const itemCarrito = carrito.find(item => item.id === idProd);
    if(itemCarrito) {
        if((itemCarrito.cantidad + cantidad) > prod.stock) {
            alert(`No puedes agregar más. Supera el stock disponible (${prod.stock}).`);
            return;
        }
        itemCarrito.cantidad += cantidad;
    } else {
        carrito.push({
            id: prod.id,
            nombre: prod.nombre,
            precioNormal: prod.precio,
            precioMayor: prod.precioMayor,
            cantMayor: prod.cantMayor,
            cantidad: cantidad
        });
    }

    document.getElementById('venta-cantidad').value = 1;
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    const tbody = document.getElementById('tabla-carrito');
    tbody.innerHTML = '';
    let totalAcumulado = 0;

    if(carrito.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-slate-400">El carrito está vacío.</td></tr>`;
        document.getElementById('carrito-total').innerText = "S/ 0.00";
        return;
    }

    carrito.forEach((item, index) => {
        let usaPrecioMayor = false;
        if(item.precioMayor && item.cantMayor && item.cantidad >= item.cantMayor) {
            usaPrecioMayor = true;
        }
        const precioAplicado = usaPrecioMayor ? item.precioMayor : item.precioNormal;
        const subtotal = precioAplicado * item.cantidad;
        totalAcumulado += subtotal;

        const tagPrecio = usaPrecioMayor 
            ? `<span class="text-indigo-600 font-bold" title="Precio Mayorista Aplicado">S/ ${precioAplicado.toFixed(2)} 🔥</span>`
            : `<span>S/ ${precioAplicado.toFixed(2)}</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50">
                <td class="px-4 py-2.5 font-medium text-slate-700">${item.nombre}</td>
                <td class="px-4 py-2.5 text-right">${tagPrecio}</td>
                <td class="px-4 py-2.5 text-center font-semibold text-slate-600">${item.cantidad}</td>
                <td class="px-4 py-2.5 text-right font-bold text-slate-800">S/ ${subtotal.toFixed(2)}</td>
                <td class="px-4 py-2.5 text-center">
                    <button onclick="quitarDelCarrito(${index})" class="text-rose-500 hover:text-rose-800 text-xs bg-rose-50 px-2 py-1 rounded">Quitar</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('carrito-total').innerText = `S/ ${totalAcumulado.toFixed(2)}`;
}

function quitarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarVistaCarrito();
}

function vaciarCarrito() {
    if(carrito.length > 0 && confirm("¿Vaciar toda la lista actual?")) {
        carrito = [];
        actualizarVistaCarrito();
    }
}

async function procesarVenta() {
    if(carrito.length === 0) { alert("El carrito está vacío."); return; }

    const metodoPago = document.getElementById('venta-pago').value;
    let totalFinal = 0;

    const itemsProcesados = carrito.map(item => {
        let usaPrecioMayor = (item.precioMayor && item.cantMayor && item.cantidad >= item.cantMayor);
        const precioAplicado = usaPrecioMayor ? item.precioMayor : item.precioNormal;
        const subtotal = precioAplicado * item.cantidad;
        totalFinal += subtotal;

        return {
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioCobrado: precioAplicado,
            subtotal: subtotal
        };
    });

    if(!confirm(`¿Confirmar venta por un total de S/ ${totalFinal.toFixed(2)} con pago en ${metodoPago}?`)) return;

    try {
        // 1. Descontar stock localmente y subir actualizaciones de productos a la nube
        for(let item of itemsProcesados) {
            const prodReal = productos.find(p => p.id === item.id);
            if(prodReal) {
                prodReal.stock -= item.cantidad;
                await _supabase.from('productos').update({ stock: prodReal.stock }).eq('id', prodReal.id);
            }
        }

        // 2. Insertar la nueva venta en la tabla ventas de la nube
        const hoy = new Date();
        const nuevaVenta = {
            id: Date.now().toString(),
            fecha_completa: hoy.toLocaleString('es-PE', { timeZone: 'America/Lima' }),
            fecha_filtro: obtenerFechaLocalPeru(),
            items: itemsProcesados,
            metodo_pago: metodoPago,
            total: totalFinal
        };

        const { error } = await _supabase.from('ventas').insert(nuevaVenta);
        if(error) throw error;

        alert("🛒 ¡Venta procesada con éxito y sincronizada en la nube!");
        carrito = [];
        
        // 3. Sincronizar y refrescar pantallas
        await descargarTodoDeLaNube();
        actualizarVistaCarrito();
        filtrarProductosVenta();
    } catch(err) {
        console.error(err);
        alert("Ocurrió un problema al procesar la venta: " + err.message);
    }
}