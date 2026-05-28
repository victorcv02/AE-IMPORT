// --- MÓDULO DE HISTORIAL Y REPORTES PDF ---
function actualizarFiltrosFechas() {
    const periodo = document.getElementById('filtro-periodo').value;
    const desdeInput = document.getElementById('filtro-desde');
    const hastaInput = document.getElementById('filtro-hasta');

    const hoyStr = obtenerFechaLocalPeru();

    if(periodo === 'todos') {
        desdeInput.value = ''; hastaInput.value = '';
        desdeInput.disabled = true; hastaInput.disabled = true;
    } else if(periodo === 'hoy') {
        desdeInput.value = hoyStr; hastaInput.value = hoyStr;
        desdeInput.disabled = true; hastaInput.disabled = true;
    } else if(periodo === 'semana') {
        const hoy = new Date();
        const diaSemana = hoy.getDay(); 
        const diferencia = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
        const lunes = new Date(hoy.setDate(diferencia));
        
        const yyyy = lunes.getFullYear();
        const mm = String(lunes.getMonth() + 1).padStart(2, '0');
        const dd = String(lunes.getDate()).padStart(2, '0');
        
        desdeInput.value = `${yyyy}-${mm}-${dd}`;
        hastaInput.value = hoyStr;
        desdeInput.disabled = true; hastaInput.disabled = true;
    } else if(periodo === 'mes') {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        
        desdeInput.value = `${yyyy}-${mm}-01`;
        hastaInput.value = hoyStr;
        desdeInput.disabled = true; hastaInput.disabled = true;
    } else if(periodo === 'personalizado') {
        desdeInput.disabled = false; hastaInput.disabled = false;
    }
    listarVentas();
}

function listarVentas() {
    const tbody = document.getElementById('tabla-historial');
    tbody.innerHTML = '';

    const periodo = document.getElementById('filtro-periodo').value;
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;

    let filtradas = ventas;

    if(periodo !== 'todos' && desde && hasta) {
        filtradas = ventas.filter(v => v.fechaFiltro >= desde && v.fechaFiltro <= hasta);
    }

    // Ordenar de más recientes a más antiguas
    filtradas.sort((a,b) => b.id.localeCompare(a.id));

    let sumaTotal = 0;
    let sumaEfectivo = 0;
    let sumaYape = 0;
    let sumaTarjeta = 0;

    if(filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-5 text-slate-400">No hay ventas registradas en el rango seleccionado.</td></tr>`;
        inyectarMontosReporte(0, 0, 0, 0, 0);
        return;
    }

    filtradas.forEach(v => {
        sumaTotal += v.total;
        if(v.metodoPago === 'Efectivo') sumaEfectivo += v.total;
        else if(v.metodoPago === 'Yape/Plin') sumaYape += v.total;
        else sumaTarjeta += v.total; // Tarjeta o Transferencia

        let detalleItems = v.items.map(i => `• ${i.nombre} (x${i.cantidad})`).join('<br>');

        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 text-center">
                    <button onclick="this.parentElement.parentElement.nextElementSibling.classList.toggle('hidden')" class="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">🔎</button>
                </td>
                <td class="px-5 py-3 font-medium text-slate-700">${v.fechaCompleta} <span class="ml-2 text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded border border-indigo-100">${v.metodoPago}</span></td>
                <td class="px-5 py-3 text-center text-slate-600 font-medium">${v.items.reduce((s,i)=> s + i.cantidad, 0)} u.</td>
                <td class="px-5 py-3 text-right font-black text-slate-800">S/ ${v.total.toFixed(2)}</td>
            </tr>
            <tr class="hidden bg-indigo-50/30">
                <td colspan="4" class="px-12 py-3 text-xs text-slate-600 space-y-1">
                    <p class="font-bold text-indigo-800 mb-1 uppercase tracking-wider">📦 Desglose de Productos Comprados:</p>
                    ${detalleItems}
                </td>
            </tr>
        `;
    });

    inyectarMontosReporte(sumaTotal, filtradas.length, sumaEfectivo, sumaYape, sumaTarjeta);
}

function inyectarMontosReporte(total, cantidad, efec, yape, tarj) {
    document.getElementById('rep-total-monto').innerText = `S/ ${total.toFixed(2)}`;
    document.getElementById('rep-total-ventas').innerText = cantidad;
    document.getElementById('rep-efectivo').innerText = `S/ ${efec.toFixed(2)}`;
    document.getElementById('rep-yape').innerText = `S/ ${yape.toFixed(2)}`;
    document.getElementById('rep-tarjeta').innerText = `S/ ${tarj.toFixed(2)}`;
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const periodo = document.getElementById('filtro-periodo').value.toUpperCase();
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    
    let filtradas = ventas;
    if(periodo !== 'TODOS' && desde && hasta) {
        filtradas = ventas.filter(v => v.fechaFiltro >= desde && v.fechaFiltro <= hasta);
    }
    filtradas.sort((a,b) => b.id.localeCompare(a.id));

    // Cabecera elegante del PDF
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 220, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("headline", "bold");
    doc.setFontSize(22);
    doc.text("REPORTE DE VENTAS - MI TIENDA", 14, 25);
    
    doc.setFontSize(10);
    doc.setFont("normal");
    doc.text(`Filtro Aplicado: ${periodo} [${desde || 'Inicio'} hasta ${hasta || 'Hoy'}]`, 14, 33);

    // Resumen Financiero en cuadros de texto
    let totalMonto = filtradas.reduce((s,v)=> s + v.total, 0);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("bold");
    doc.text(`Total Transacciones: ${filtradas.length}`, 14, 52);
    doc.text(`Monto Total Recaudado: S/ ${totalMonto.toFixed(2)}`, 14, 58);
    doc.line(14, 62, 196, 62);

    // Armar tabla de filas para el plugin AutoTable
    let filasTabla = [];
    filtradas.forEach(v => {
        let detalleNombres = v.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
        filasTabla.push([
            v.fechaCompleta,
            v.metodoPago,
            detalleNombres,
            `S/ ${v.total.toFixed(2)}`
        ]);
    });

    doc.autoTable({
        startY: 66,
        head: [['Fecha y Hora', 'Pago', 'Productos Detallados', 'Total']],
        body: filasTabla,
        headStyles: { fillBox: true, fillColor: [79, 70, 229], textColor: [255,255,255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
            0: { cellWidth: 38 },
            1: { cellWidth: 24 },
            2: { cellWidth: 100 },
            3: { cellWidth: 24, halign: 'right' }
        }
    });

    doc.save(`Reporte_Ventas_${obtenerFechaLocalPeru()}.pdf`);
}