// --- MÓDULO DEL DASHBOARD ---
function cargarDashboard() {
    document.getElementById('dash-productos-count').innerText = productos.length;
    const criticos = productos.filter(p => p.stock <= p.minimo);
    document.getElementById('dash-alertas-count').innerText = criticos.length;

    const panel = document.getElementById('panel-alertas');
    const lista = document.getElementById('lista-alertas');
    lista.innerHTML = '';

    if(criticos.length > 0) {
        panel.classList.remove('hidden');
        criticos.forEach(p => {
            lista.innerHTML += `<li><strong>${p.nombre}</strong> - Stock actual: ${p.stock} (Mínimo: ${p.minimo})</li>`;
        });
    } else { 
        panel.classList.add('hidden'); 
    }

    const hoyStr = obtenerFechaLocalPeru();
    const vHoy = ventas.filter(v => v.fechaFiltro === hoyStr);

    document.getElementById('dash-ingresos').innerText = `S/ ${vHoy.reduce((s, v) => s + v.total, 0).toFixed(2)}`;
    document.getElementById('dash-ventas-count').innerText = vHoy.length;
}