// Configuración de Supabase conectada a tu base de datos real
const SUPABASE_URL = "https://cstgkmmofjhzqdadsgic.supabase.co";
const SUPABASE_KEY = "sb_publishable_vZgIBF8BQXeTJerqpTSVPA_GfAwlPox";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables Globales compartidas por todos los módulos
let productos = [];
let ventas = [];
let carrito = [];

// --- MÓDULO DE AUTENTICACIÓN (LOGIN) ---
async function ejecutarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btnText = document.getElementById('btn-login-text');

    errorEl.classList.add('hidden');
    btnText.innerText = "⏳ Validando credenciales...";
    btnText.disabled = true;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) {
        errorEl.classList.remove('hidden');
        btnText.innerText = "🔑 Iniciar Sesión";
        btnText.disabled = false;
        return;
    }

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    await arrancarSistemaConectado();
}

async function arrancarSistemaConectado() {
    try {
        await descargarTodoDeLaNube();
        cargarDashboard();
    } catch (err) {
        console.error(err);
        alert("Error al sincronizar las tablas de la nube.");
    }
}

async function verificarSesionActiva() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        await arrancarSistemaConectado();
    }
}

async function ejecutarCerrarSesion() {
    if(confirm("¿Deseas cerrar sesión en este dispositivo?")) {
        await _supabase.auth.signOut();
        window.location.reload();
    }
}

// Descarga inicial unificada de datos
async function descargarTodoDeLaNube() {
    const { data: dataProds, error: errProds } = await _supabase.from('productos').select('*');
    if (errProds) throw errProds;
    productos = dataProds.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria || 'Sin categoría',
        precio: parseFloat(p.precio),
        stock: parseInt(p.stock),
        minimo: parseInt(p.minimo),
        precioMayor: p.precio_mayor ? parseFloat(p.precio_mayor) : null,
        cantMayor: p.cant_mayor ? parseInt(p.cant_mayor) : null
    }));

    const { data: dataVentas, error: errVentas } = await _supabase.from('ventas').select('*');
    if (errVentas) throw errVentas;
    ventas = dataVentas.map(v => ({
        id: v.id,
        fechaCompleta: v.fecha_completa,
        fechaFiltro: v.fecha_filtro,
        items: v.items,
        metodoPago: v.metodo_pago,
        total: parseFloat(v.total)
    }));
}

function obtenerFechaLocalPeru() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Control central de pestañas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('bg-indigo-800', 'text-white');
        el.classList.add('hover:bg-indigo-600');
    });
    const targetTab = document.getElementById(tabId);
    if(targetTab) {
        targetTab.style.setProperty('display', 'block', 'important');
        targetTab.classList.add('active');
    }
    const targetBtn = document.getElementById(`btn-${tabId}`);
    if(targetBtn) {
        targetBtn.classList.add('bg-indigo-800', 'text-white');
        targetBtn.classList.remove('hover:bg-indigo-600');
    }

    if(tabId === 'dashboard') cargarDashboard();
    if(tabId === 'productos') { listarProductosInventario(); limpiarFormProducto(); }
    if(tabId === 'ventas') { filtrarProductosVenta(); actualizarVistaCarrito(); }
    if(tabId === 'reportes') { listarVentas(); }
}

window.onload = function() {
    document.getElementById('filtro-periodo').value = 'todos';
    document.getElementById('filtro-desde').disabled = true;
    document.getElementById('filtro-hasta').disabled = true;
    verificarSesionActiva();
};