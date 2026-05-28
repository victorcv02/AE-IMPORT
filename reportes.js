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
        else sumaTarjeta += v.total;

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

// --- NUEVA FUNCIÓN MEJORADA: PDF AGRUPADO POR FECHAS EXACTAS ---
function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const periodo = document.getElementById('filtro-periodo').value.toUpperCase();
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    
    let filtradas = [...ventas];
    if(periodo !== 'TODOS' && desde && hasta) {
        filtradas = ventas.filter(v => v.fechaFiltro >= desde && v.fechaFiltro <= hasta);
    }
    
    // Ordenar cronológicamente (antiguo a reciente) para armar los días consecutivamente
    filtradas.sort((a,b) => a.fechaFiltro.localeCompare(b.fechaFiltro));

    // Cabecera Principal del PDF
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 220, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("headline", "bold");
    doc.setFontSize(20);
    doc.text("REPORTE HISTORIAL DE VENTAS", 14, 20);
    
    doc.setFontSize(9);
    doc.setFont("normal");
    doc.text(`Filtro: ${periodo} [Período del: ${desde || 'El Inicio'} hasta: ${hasta || 'Hoy'}]`, 14, 29);

    // Resumen Global del Periodo
    let totalMontoGlobal = filtradas.reduce((s,v)=> s + v.total, 0);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("bold");
    doc.text(`Total Transacciones en el Rango: ${filtradas.length}`, 14, 48);
    doc.text(`Recaudación Total General: S/ ${totalMontoGlobal.toFixed(2)}`, 115, 48);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 52, 196, 52);

    if(filtradas.length === 0) {
        doc.text("No se encontraron transacciones registradas.", 14, 62);
        doc.save(`Reporte_Ventas_${obtenerFechaLocalPeru()}.pdf`);
        return;
    }

    // --- AGRUPAR VENTAS POR DÍA ---
    const ventasPorDia = {};
    filtradas.forEach(v => {
        // Usamos la fecha limpia (AAAA-MM-DD) para agrupar las ventas
        if (!ventasPorDia[v.fechaFiltro]) {
            ventasPorDia[v.fechaFiltro] = [];
        }
        ventasPorDia[v.fechaFiltro].push(v);
    });

    let currentY = 58;

    // Recorrer día por día para armar tablas separadas
    Object.keys(ventasPorDia).forEach(fechaKey => {
        const ventasDelDia = ventasPorDia[fechaKey];
        let totalDelDia = 0;

        // Validar salto de página si el espacio disponible es muy corto
        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        }

        // Formatear el encabezado del día (Ej: FECHA: 2026-05-28)
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 7, 'F');
        doc.setTextColor(51, 65, 85);
        doc.setFont("normal", "bold");
        doc.setFontSize(10);
        
        // Convertir la fecha a un texto más amigable
        const partesFecha = fechaKey.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        doc.text(`📅 VENTAS DEL DÍA: ${fechaFormateada}`, 18, currentY + 5);
        
        currentY += 10;

        // Construir el desglose de filas para la tabla de este día
        let filasTablaDia = [];
        ventasDelDia.forEach(v => {
            totalDelDia += v.total;
            let detalleNombres = v.items.map(i => `${i.nombre} (x${i.cantidad})`).join(', ');
            
            // Extraer solo la hora de la fecha completa si se desea, o dejarla completa
            const hora = v.fechaCompleta.includes(', ') ? v.fechaCompleta.split(', ')[1] : v.fechaCompleta;

            filasTablaDia.push([
                hora,
                v.metodoPago,
                detalleNombres,
                `S/ ${v.total.toFixed(2)}`
            ]);
        });

        // Dibujar la tabla del día usando AutoTable
        doc.autoTable({
            startY: currentY,
            head: [['Hora / Registro', 'Método Pago', 'Artículos Comprados', 'Monto']],
            body: filasTablaDia,
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8.5, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { cellWidth: 98 },
                3: { cellWidth: 24, halign: 'right' }
            },
            theme: 'striped',
            margin: { left: 14, right: 14 }
        });

        // Actualizar la posición de la Y después de la tabla
        currentY = doc.lastAutoTable.finalY + 4;

        // Imprimir el total acumulado de ese día específico
        doc.setTextColor(16, 185, 129); // Color esmeralda profesional
        doc.setFont("normal", "bold");
        doc.setFontSize(10);
        doc.text(`Total del día (${fechaFormateada}): S/ ${totalDelDia.toFixed(2)}`, 130, currentY);
        
        // Una línea divisoria sutil antes de pasar al siguiente día
        currentY += 4;
        doc.setDrawColor(226, 232, 240);
        doc.line(14, currentY, 196, currentY);
        currentY += 6;
    });

    // Guardar el archivo PDF definitivo
    doc.save(`Reporte_Ventas_Agrupado_${obtenerFechaLocalPeru()}.pdf`);
}
