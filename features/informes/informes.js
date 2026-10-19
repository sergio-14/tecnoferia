// =========================================================================
// ARCHIVO: features/informes/informes.js
// FUNCIÓN: Generación de reportes dinámicos, 8 Certificados Oficiales y Ternas
// =========================================================================

const generarCabeceraOficial = (tituloReporte, notaExtra = "") => {
    const extraHtml = notaExtra ? `<p style="font-family: Arial, sans-serif; font-size: 13px; color: #333; margin-bottom: 15px;"><strong>Nota Explicativa:</strong> ${notaExtra}</p>` : "";
    return `
        <div style="text-align: center; margin-bottom: 30px; font-family: Arial, sans-serif;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; color: #000;">Instituto de Investigación Interacción Social y Posgrado</h2>
            <h3 style="margin: 5px 0; font-size: 16px; color: #555;">Tecno Feria 2026 - Universidad Autónoma del Beni José Ballivián</h3>
            <h1 style="margin: 20px 0; font-size: 22px; text-decoration: underline; color: #000;">${tituloReporte}</h1>
            <p style="margin: 0; font-size: 12px; color: #333;">Fecha de emisión: ${new Date().toLocaleDateString()}</p>
        </div>
        ${extraHtml}
    `;
};

const normalizarNombre = str => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// 🔥 GENERADOR DE CÓDIGO ALEATORIO ÚNICO PARA EL QR DEL CERTIFICADO 🔥
const generarCodigoAleatorioQR = () => {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let bloque1 = '';
    let bloque2 = '';
    for (let i = 0; i < 4; i++) bloque1 += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    for (let i = 0; i < 4; i++) bloque2 += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    return `TF26-${bloque1}-${bloque2}`;
};

// 🔥 LISTA OFICIAL DEL COMITÉ ORGANIZADOR PARA DETECCIÓN AUTOMÁTICA 🔥
const LISTA_COMITE_ORGANIZADOR = [
    { nombre: "M.Sc. Ing. Eduardo Morales Barroso", cargo: "Director de Carrera C.I.S. - Comité Organizador" },
    { nombre: "M.Sc. Lic. William Chao Rivero", cargo: "Resp. Instituto de Investigación I.I.S.P." },
    { nombre: "Ing. Marco Antonio Durán Carvalho", cargo: "Resp. de Investigación I.I.I.S. y P." },
    { nombre: "Ing. Adriana Gómez Morant", cargo: "Resp. de Interacción Social I.I.I.S. y P." },
    { nombre: "M.Sc. Lic. Danitza Zabala Moreno", cargo: "Docente Apoyo de Investigación" },
    { nombre: "Lic. Luis Antonio Franco Apuri", cargo: "Docente Apoyo de Interacción Social" },
    { nombre: "Ing. Jesús Elias Nieme Saavedra", cargo: "Docente Apoyo de Interacción Social" }
];

const extraerNombresDeProyecto = (integrantesStringRaw, ciLiderStr = "", nombreLiderReal = "") => {
    if (!integrantesStringRaw) return `Líder: ${nombreLiderReal}`;
    
    const liderNorm = normalizarNombre(nombreLiderReal);
    const pLider = liderNorm.split(' ');
    const n1 = pLider[0];
    const a1 = pLider.find(p => p.length > 2 && p !== n1) || '';

    const esElLider = (nombreEvaluar) => {
        const norm = normalizarNombre(nombreEvaluar);
        if (norm.length > liderNorm.length + 15) return false;
        if (norm === liderNorm) return true;
        if (n1 && a1 && norm.includes(n1) && norm.includes(a1)) return true;
        return false;
    };

    if (integrantesStringRaw.includes('|||')) {
        const partes = integrantesStringRaw.split('|||');
        try {
            const arr = JSON.parse(partes[1].trim());
            const liderP = partes[0].replace('⭐ LÍDER:', '').split('|')[0].trim() || nombreLiderReal;
            
            const equipoFiltrado = arr.filter(m => String(m.ci).trim() !== ciLiderStr && !esElLider(m.nombre));
            
            if (equipoFiltrado.length > 0) return `Líder: ${liderP}, Equipo: ` + equipoFiltrado.map(i => i.nombre).join(', ');
            return `Líder: ${liderP}`;
        } catch(e) {}
    }
    
    let textoRaw = integrantesStringRaw.replace('⭐ LÍDER:', '').replace(/\|\s*👥 EQUIPO:/, '').trim();
    if (textoRaw === "" || esElLider(textoRaw)) return `Líder: ${nombreLiderReal}`;

    let listaOld = [];
    if (/\d\./.test(textoRaw)) {
        listaOld = textoRaw.split(/\d+\./).map(s=>s.trim()).filter(s => s.length > 2 && !esElLider(s));
    } else if (textoRaw.includes(',') || textoRaw.toLowerCase().includes(' y ')) {
        listaOld = textoRaw.split(/,(?![^\(]*\))|\by\b|\(integrante\)/i).map(s=>s.trim()).filter(s => s.length > 2 && !esElLider(s));
    } else {
        listaOld = [textoRaw];
    }

    if (listaOld.length > 0) return `Líder: ${nombreLiderReal}, Equipo: ` + listaOld.join(', ');
    return `Líder: ${nombreLiderReal}`;
};

// 🔥 FUNCIÓN PARA EXTRAER SOLAMENTE AL LÍDER DEL PROYECTO 🔥
const extraerSoloLiderDeProyecto = (integrantesStringRaw, nombreLiderReal = "") => {
    if (nombreLiderReal && nombreLiderReal !== "Desconocido") {
        return nombreLiderReal.trim();
    }
    if (integrantesStringRaw && integrantesStringRaw.includes('⭐ LÍDER:')) {
        return integrantesStringRaw.split('⭐ LÍDER:')[1].split('|')[0].trim();
    }
    return "Sin Líder Registrado";
};

// 🔥 EXTRAER TODOS LOS MIEMBROS DE UN PROYECTO (LÍDER + EQUIPO) PARA CERTIFICADOS 🔥
const obtenerMiembrosProyecto = (proy, expositores) => {
    const miembros = [];
    const ciLider = String(proy.ci_propietario || "").trim();
    const expLider = expositores.find(e => String(e.ci).trim() === ciLider);
    let nombreLider = expLider ? expLider.nombre_completo : "";

    const raw = proy.integrantes || "";
    if (!nombreLider && raw.includes('⭐ LÍDER:')) {
        nombreLider = raw.split('⭐ LÍDER:')[1].split('|')[0].trim();
    }
    if (nombreLider) {
        miembros.push({ ci: ciLider || nombreLider, nombre: nombreLider.trim(), rolProyecto: 'LÍDER DE PROYECTO' });
    }

    if (raw.includes('|||')) {
        try {
            const arr = JSON.parse(raw.split('|||')[1].trim());
            arr.forEach(m => {
                if (m && m.nombre) {
                    const ciM = String(m.ci || m.nombre).trim();
                    const yaEsta = miembros.some(x => (x.ci && x.ci === ciM) || normalizarNombre(x.nombre) === normalizarNombre(m.nombre));
                    if (!yaEsta) {
                        miembros.push({ ci: ciM, nombre: m.nombre.trim(), rolProyecto: 'EXPOSITOR(A)' });
                    }
                }
            });
        } catch (e) {}
    } else {
        let textoRaw = raw.replace('⭐ LÍDER:', '').replace(/\|\s*👥 EQUIPO:/, '|').trim();
        const partes = textoRaw.split('|');
        const eqStr = partes.length > 1 ? partes[1] : partes[0];
        let nombresExtra = [];
        if (/\d\./.test(eqStr)) {
            nombresExtra = eqStr.split(/\d+\./).map(s => s.trim()).filter(s => s.length > 2);
        } else if (eqStr.includes(',') || eqStr.toLowerCase().includes(' y ')) {
            nombresExtra = eqStr.split(/,(?![^\(]*\))|\by\b|\(integrante\)/i).map(s => s.trim()).filter(s => s.length > 2);
        }
        nombresExtra.forEach(nom => {
            const limpio = nom.replace(/\(CI:.*?\)/ig, '').trim();
            if (limpio.length > 2 && !miembros.some(x => normalizarNombre(x.nombre) === normalizarNombre(limpio))) {
                const expMatch = expositores.find(e => normalizarNombre(e.nombre_completo) === normalizarNombre(limpio));
                miembros.push({ ci: expMatch ? String(expMatch.ci).trim() : limpio, nombre: limpio, rolProyecto: 'EXPOSITOR(A)' });
            }
        });
    }
    return miembros;
};

// 🔥 ORDEN OFICIAL FIJO E INAMOVIBLE DE PROYECTOS 🔥
const ORDEN_OFICIAL_ESTUDIANTES = [
    { num: 1, clave: "letrero2f" },
    { num: 2, clave: "siscombec" },
    { num: 3, clave: "contabeni" },
    { num: 4, clave: "niva" },
    { num: 5, clave: "sensor de medicion" },
    { num: 6, clave: "aula virtual" },
    { num: 7, clave: "redtrampa" },
    { num: 8, clave: "reporte ciudadano" },
    { num: 9, clave: "estudios de campo en salud" },
    { num: 10, clave: "benitours" },
    { num: 11, clave: "die-cert" },
    { num: 12, clave: "cronoclick" },
    { num: 13, clave: "invernia" },
    { num: 14, clave: "ubistock" },
    { num: 15, clave: "ingreso por servicio hospitalario" },
    { num: 16, clave: "trinidad reporta" },
    { num: 17, clave: "cine express" },
    { num: 18, clave: "bio-beni" },
    { num: 19, clave: "geovector" }
];

const ORDEN_OFICIAL_DOCENTES = [
    { num: 1, clave: "plataforma geoespacial" },
    { num: 2, clave: "derivadas parciales" },
    { num: 3, clave: "cabina fotografica" },
    { num: 4, clave: "comercia" },
    { num: 5, clave: "mis finanzas" },
    { num: 6, clave: "feriafit" },
    { num: 7, clave: "control ganadero" }
];

const construirMapaNumerosOficiales = (proyectos) => {
    const proyectosValidos = [...proyectos]
        .filter(p => p.estado_evaluacion !== 'Evaluado (No clasifica)')
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    const mapa = {};
    let fallbackEst = 20, fallbackDoc = 8, fallbackEmp = 1;

    proyectosValidos.forEach(p => {
        const titNorm = normalizarNombre(p.titulo || "");
        const cat = (p.categoria || "").toLowerCase();

        if (cat.includes('estudiante')) {
            const encontrado = ORDEN_OFICIAL_ESTUDIANTES.find(item => titNorm.includes(item.clave));
            mapa[String(p.id)] = encontrado ? encontrado.num : fallbackEst++;
        } else if (cat.includes('docente')) {
            const encontrado = ORDEN_OFICIAL_DOCENTES.find(item => titNorm.includes(item.clave));
            mapa[String(p.id)] = encontrado ? encontrado.num : fallbackDoc++;
        } else if (cat.includes('emprendimiento')) {
            mapa[String(p.id)] = fallbackEmp++;
        }
    });

    return { proyectosValidos, mapa };
};

// 🔥 CARGAR BUSCADOR INTELIGENTE DE CERTIFICADOS CON LOS 8 PERFILES 🔥
window.cargarBuscadorCertificadosCompleto = async function() {
    const datalist = document.getElementById('lista-usuarios-cert');
    if (!datalist) return;

    try {
        const res = await fetch('/api/datos_informes');
        const db = await res.json();
        const { proyectos, expositores, tribunales, visitantes, colaboradores } = db;

        const opcionesMap = new Map();

        // 0. Administrador / Implementación del Sistema
        opcionesMap.set('admin_sistema_principal', {
            valor: 'Luis Alex Fernández Tejaya',
            etiqueta: '💻 LUIS ALEX FERNÁNDEZ TEJAYA — ADMINISTRADOR E IMPLEMENTACIÓN DEL SISTEMA'
        });

        // 1. Comité Organizador Oficial
        LISTA_COMITE_ORGANIZADOR.forEach(org => {
            const clave = normalizarNombre(org.nombre);
            opcionesMap.set(`org_${clave}`, {
                valor: org.nombre,
                etiqueta: `🏛️ ${org.nombre.toUpperCase()} — COMITÉ ORGANIZADOR (${org.cargo})`
            });
        });

        // 2. Tribunales Evaluadores
        (tribunales || []).forEach(t => {
            const clave = normalizarNombre(t.nombre_completo);
            opcionesMap.set(`trib_${clave}`, {
                valor: t.nombre_completo,
                etiqueta: `⚖️ ${(t.nombre_completo || "").toUpperCase()} — TRIBUNAL EVALUADOR`
            });
        });

        // 3. Colaboradores Oficiales
        (colaboradores || []).forEach(c => {
            const clave = normalizarNombre(c.nombre_completo);
            opcionesMap.set(`colab_${clave}`, {
                valor: c.nombre_completo.toUpperCase(),
                etiqueta: `🤝 ${c.nombre_completo.toUpperCase()} — COLABORADOR OFICIAL`
            });
        });

        // 4. Expositores y Co-expositores de proyectos
        proyectos.forEach(p => {
            if (p.estado_evaluacion === 'Evaluado (No clasifica)') return;
            const miembros = obtenerMiembrosProyecto(p, expositores);
            miembros.forEach(m => {
                const clave = normalizarNombre(m.nombre);
                const valorInput = (m.ci && m.ci !== m.nombre) ? m.ci : m.nombre;
                opcionesMap.set(`proy_${clave}`, {
                    valor: valorInput,
                    etiqueta: `🎓 ${m.nombre.toUpperCase()} — Expositor: "${p.titulo}"`
                });
            });
        });

        // 5. Expositores sueltos
        expositores.forEach(e => {
            const clave = normalizarNombre(e.nombre_completo);
            if (!opcionesMap.has(`proy_${clave}`)) {
                opcionesMap.set(`exp_${clave}`, {
                    valor: e.ci,
                    etiqueta: `${(e.nombre_completo || "").toUpperCase()} — Expositor (${e.institucion || 'UABJB'})`
                });
            }
        });

        // 6. Visitantes
        (visitantes || []).forEach(v => {
            const clave = normalizarNombre(v.nombre_completo);
            if (!opcionesMap.has(`proy_${clave}`) && !opcionesMap.has(`exp_${clave}`)) {
                opcionesMap.set(`vis_${clave}`, {
                    valor: v.ci,
                    etiqueta: `${(v.nombre_completo || "").toUpperCase()} — Visitante (${v.institucion || 'Público'})`
                });
            }
        });

        datalist.innerHTML = '';
        Array.from(opcionesMap.values()).forEach(op => {
            const option = document.createElement('option');
            option.value = op.valor;
            option.textContent = op.etiqueta;
            datalist.appendChild(option);
        });
    } catch (e) {
        console.error("Error poblando buscador de certificados:", e);
    }
};

function inicializarFiltroVisitantes() {
    const tipoSelect = document.getElementById('tipo-informe-select');
    if(!tipoSelect) return;

    if (!tipoSelect.querySelector('option[value="detalle_impacto"]')) {
        const optImpacto = document.createElement('option');
        optImpacto.value = 'detalle_impacto';
        optImpacto.style.fontWeight = 'bold';
        optImpacto.style.color = '#198754';
        optImpacto.textContent = '🌱 Detalle de Calificaciones: Premio al Impacto Social (Criterio 5)';
        
        const optPremios = tipoSelect.querySelector('option[value="premios_especiales"]');
        if (optPremios && optPremios.nextSibling) {
            tipoSelect.insertBefore(optImpacto, optPremios.nextSibling);
        } else {
            tipoSelect.appendChild(optImpacto);
        }
    }

    tipoSelect.addEventListener('change', async (e) => {
        let subContainer = document.getElementById('sub-filtro-visitantes');
        
        if (e.target.value === 'padron_visitantes') {
            if (!subContainer) {
                subContainer = document.createElement('div');
                subContainer.id = 'sub-filtro-visitantes';
                subContainer.style.margin = '15px 0';
                subContainer.innerHTML = `
                    <label style="display:block; margin-bottom:5px; font-weight:bold; color:#002b5c;">Seleccione la Institución / Colegio:</label>
                    <select id="institucion-select" style="width:100%; padding:10px; border-radius:5px; border:1px solid #ccc; outline:none; font-family: Arial; box-sizing: border-box;">
                        <option value="TODOS">Todas las Instituciones (Padrón General)</option>
                    </select>
                `;
                tipoSelect.parentNode.insertBefore(subContainer, tipoSelect.nextSibling);
                
                try {
                    const res = await fetch('/api/datos_informes');
                    const dbData = await res.json();
                    const instMap = new Map();
                    
                    const procesarInst = (p) => {
                        if (p.institucion) {
                            let inst = p.institucion.trim();
                            instMap.set(inst.toLowerCase(), inst);
                        }
                    };

                    dbData.visitantes.forEach(procesarInst);
                    dbData.expositores.forEach(procesarInst);
                    
                    const selectFiltro = document.getElementById('institucion-select');
                    Array.from(instMap.values()).sort().forEach(inst => {
                        let esColegio = /colegio|unidad educativa|escuela|uab|universidad|normal|instituto|u\.e|fatima|salle|suarez|agosto/i.test(inst);
                        selectFiltro.innerHTML += `<option value="${inst}">${esColegio ? inst : `Visitante Externo - ${inst}`}</option>`;
                    });
                    selectFiltro.addEventListener('change', window.generarVistaPrevia);
                } catch (error) { console.error(error); }
            }
            subContainer.style.display = 'block'; 
        } else {
            if (subContainer) subContainer.style.display = 'none'; 
        }
        window.generarVistaPrevia();
    });
}

document.addEventListener('DOMContentLoaded', inicializarFiltroVisitantes);

window.toggleBuscadorCertificado = function() {
    const select = document.getElementById('tipo-informe-select');
    const cajaBusqueda = document.getElementById('caja-buscador-certificado');
    const inputCi = document.getElementById('cert-ci-input');
    
    if (select.value === 'certificado') {
        cajaBusqueda.style.display = 'block';
        inputCi.setAttribute('required', 'true');
        inputCi.setAttribute('placeholder', 'Busque por Nombre o C.I. (Expositor, Tribunal, Organizador, Colaborador, Admin)...');
        cajaBusqueda.style.opacity = '0';
        setTimeout(() => cajaBusqueda.style.opacity = '1', 50);
        cajaBusqueda.style.transition = 'opacity 0.3s ease';
        window.cargarBuscadorCertificadosCompleto();
    } else {
        cajaBusqueda.style.display = 'none';
        inputCi.removeAttribute('required');
    }
};

window.procesarInformeActual = async function(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo-informe-select').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;

    if (tipo === 'certificado') {
        const termino = document.getElementById('cert-ci-input').value.trim();
        if (!termino) { alert("⚠️ Por favor, ingrese el C.I. o Nombre Completo de la persona."); return; }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando Rol y Generando...';
        btn.disabled = true;

        await window.generarCertificadoParticipacion(termino);
        
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
        return;
    }

    window.imprimirInformeActual(e);
};

// =========================================================================
// 🔥 MOTOR DE LOS 8 CERTIFICADOS OFICIALES CON DETECCIÓN AUTOMÁTICA Y QR ALEATORIO 🔥
// =========================================================================
window.generarCertificadoParticipacion = async function(terminoBusqueda) {
    try {
        const res = await fetch('/api/datos_informes');
        if (!res.ok) throw new Error("Error al consultar la base de datos.");
        const db = await res.json();
        const { proyectos, expositores, tribunales, visitantes, votos, evaluaciones, colaboradores } = db;

        const termNorm = normalizarNombre(terminoBusqueda);
        const termRaw = String(terminoBusqueda).trim();
        const LUGAR_EVENTO = "Campo Ferial Luis Zambrano Ibañez Fexpo Beni – Trinidad";

        // 1. CALCULAR GANADORES DE CATEGORÍAS, IMPACTO SOCIAL Y VOTO DEL PÚBLICO
        const statsProyectos = {};
        proyectos.forEach(p => {
            if (p.estado_evaluacion === "Evaluado" || p.estado_evaluacion === "Pre-seleccionado") {
                const catRaw = (p.categoria || "").toLowerCase();
                const catKey = catRaw.includes('estudiante') ? 'estudiantes' : catRaw.includes('docente') ? 'docentes' : 'emprendimientos';
                const catNombre = catKey === 'estudiantes' 
                    ? 'Estudiantes Universitarios (Pregrado)' 
                    : catKey === 'docentes' 
                        ? 'Docentes Investigadores' 
                        : 'Emprendimientos Tecnológicos';

                statsProyectos[p.id] = {
                    proyecto: p,
                    id: p.id,
                    titulo: p.titulo || "Sin Título",
                    catKey,
                    catNombre,
                    sumaTribunal: 0,
                    cantTribunal: 0,
                    sumaImpacto: 0,
                    sumaPublico: 0,
                    cantPublico: 0,
                    miembros: obtenerMiembrosProyecto(p, expositores)
                };
            }
        });

        evaluaciones.forEach(ev => {
            if (statsProyectos[ev.id_proyecto]) {
                statsProyectos[ev.id_proyecto].sumaTribunal += (parseFloat(ev.nota) || 0);
                statsProyectos[ev.id_proyecto].sumaImpacto += (parseFloat(ev.nota_impacto) || 0);
                statsProyectos[ev.id_proyecto].cantTribunal += 1;
            }
        });

        votos.forEach(v => {
            if (statsProyectos[v.id_proyecto]) {
                statsProyectos[v.id_proyecto].sumaPublico += Math.min(parseFloat(v.nota) || 0, 100);
                statsProyectos[v.id_proyecto].cantPublico += 1;
            }
        });

        const listaCalculada = Object.values(statsProyectos).map(sp => {
            const promTrib = sp.cantTribunal > 0 ? (sp.sumaTribunal / sp.cantTribunal) : 0;
            const promPub = sp.cantPublico > 0 ? (sp.sumaPublico / sp.cantPublico) : 0;
            const promImp = sp.cantTribunal > 0 ? (sp.sumaImpacto / sp.cantTribunal) : (parseFloat(sp.proyecto.nota_impacto) || 0);
            const notaFinal = (promTrib * 0.80) + (promPub * 0.20);
            return { ...sp, promTrib, promPub, promImp, notaFinal };
        });

        // Podio por cada categoría (1°, 2° y 3° Lugar)
        const podiosPorProyecto = {};
        ['estudiantes', 'docentes', 'emprendimientos'].forEach(catK => {
            const deCat = listaCalculada.filter(x => x.catKey === catK && x.notaFinal > 0).sort((a, b) => b.notaFinal - a.notaFinal);
            deCat.slice(0, 3).forEach((proy, idx) => {
                podiosPorProyecto[proy.id] = {
                    lugar: idx + 1,
                    etiquetaLugar: `${idx + 1}° LUGAR`,
                    notaFinal: proy.notaFinal,
                    catNombre: proy.catNombre
                };
            });
        });

        // Ganador Impacto Social (Criterio 5 sobre 15 pts)
        const ganadorImpacto = [...listaCalculada].filter(x => x.promImp > 0).sort((a, b) => b.promImp - a.promImp)[0] || null;

        // Ganador Mayor Votación del Público (sobre 100 pts)
        const ganadorPublico = [...listaCalculada].filter(x => x.promPub > 0).sort((a, b) => b.promPub - a.promPub)[0] || null;

        // 2. BUSCAR A LA PERSONA EN TODAS LAS TABLAS Y PERFILES
        let personaNombre = "";
        const certificadosDetectados = [];

        const coincidePersona = (ciComparar, nombreComparar) => {
            const ciStr = String(ciComparar || "").trim();
            const nomNorm = normalizarNombre(nombreComparar || "");
            if (ciStr && ciStr.toLowerCase() === termRaw.toLowerCase()) return true;
            if (nomNorm && termNorm.length >= 3 && (nomNorm === termNorm || nomNorm.includes(termNorm) || termNorm.includes(nomNorm))) return true;
            return false;
        };

        // PERFIL A: Administrador / Implementador del Sistema
        let esAdminBD = false;
        try {
            const resUsr = await fetch(`/api/usuarios/${encodeURIComponent(termRaw)}`);
            if (resUsr.ok) {
                const usrData = await resUsr.json();
                if (usrData.rol === 'ADMIN') {
                    esAdminBD = true;
                    personaNombre = usrData.datos.nombre_completo || personaNombre;
                }
            }
        } catch (e) {}

        if (esAdminBD || termNorm.includes('luis alex fernandez') || termNorm === 'admin' || termNorm === 'administrador') {
            if (!personaNombre) personaNombre = "Luis Alex Fernández Tejaya";
            certificadosDetectados.push({
                tipo: 'admin_sistema',
                botonLabel: '💻 Implementación del Sistema (Admin)',
                colorPrimario: '#0f172a',
                colorAcento: '#0284c7',
                colorFondoSuave: '#f0f9ff',
                iconoMedalla: 'fa-laptop-code',
                textoMedalla: 'DESARROLLO E IMPLEMENTACIÓN TECNOLÓGICA',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO ESPECIAL',
                subtituloCertificado: 'ADMINISTRACIÓN E IMPLEMENTACIÓN DE LA PLATAFORMA OFICIAL',
                cuerpoHTML: `Por su destacada labor en el diseño, desarrollo, administración e <b>implementación del Sistema Web Oficial de Gestión, Evaluación de Tribunales y Votación Digital por Código QR en Tiempo Real</b> para la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            });
        }

        // PERFIL B: Comité Organizador del Evento
        const orgMatch = LISTA_COMITE_ORGANIZADOR.find(o => coincidePersona('', o.nombre));
        if (orgMatch) {
            if (!personaNombre) personaNombre = orgMatch.nombre;
            certificadosDetectados.push({
                tipo: 'organizador',
                botonLabel: '🏛️ Comité Organizador',
                colorPrimario: '#1e1b4b',
                colorAcento: '#b8860b',
                colorFondoSuave: '#fefce8',
                iconoMedalla: 'fa-sitemap',
                textoMedalla: 'COMITÉ ORGANIZADOR OFICIAL · TECNOFERIA 2026',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'ORGANIZACIÓN Y DIRECCIÓN ACADÉMICA DEL EVENTO',
                cuerpoHTML: `Por su excelente liderazgo, planificación y compromiso como miembro del <b>COMITÉ ORGANIZADOR OFICIAL (${orgMatch.cargo})</b> en la realización de la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            });
        }

        // PERFIL C: Tribunal Evaluador Oficial
        const tribMatch = (tribunales || []).find(t => coincidePersona(t.ci || t.usuario_tribunal, t.nombre_completo));
        if (tribMatch) {
            let nomTrib = tribMatch.nombre_completo || "Evaluador";
            if (!nomTrib.toLowerCase().startsWith('ing') && !nomTrib.toLowerCase().startsWith('lic') && !nomTrib.toLowerCase().startsWith('m.sc')) {
                nomTrib = "Ing. " + nomTrib;
            }
            if (!personaNombre) personaNombre = nomTrib;
            certificadosDetectados.push({
                tipo: 'tribunal',
                botonLabel: '⚖️ Tribunal Evaluador',
                colorPrimario: '#002b5c',
                colorAcento: '#b8860b',
                colorFondoSuave: '#fffdf5',
                iconoMedalla: 'fa-gavel',
                textoMedalla: 'COMITÉ EVALUADOR OFICIAL · JURADO CALIFICADOR',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'TRIBUNAL EVALUADOR OFICIAL DE PROYECTOS TECNOLÓGICOS',
                cuerpoHTML: `Por su valiosa contribución académica, rigor científico e imparcialidad en el desempeño de sus funciones como <b>TRIBUNAL EVALUADOR OFICIAL</b> en la calificación de los proyectos de investigación e innovación tecnológica de la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            });
        }

        // PERFIL D: Líder o Integrante en Proyectos (Ganadores, Impacto, Público, Participación)
        listaCalculada.forEach(sp => {
            const miembroHallado = sp.miembros.find(m => coincidePersona(m.ci, m.nombre));
            if (miembroHallado) {
                if (!personaNombre) personaNombre = miembroHallado.nombre;

                const infoPodio = podiosPorProyecto[sp.id];

                // Tipo 1: Ganador de Categoría
                if (infoPodio) {
                    certificadosDetectados.push({
                        tipo: 'ganador_categoria',
                        botonLabel: `🏆 Ganador (${infoPodio.etiquetaLugar})`,
                        colorPrimario: '#002b5c',
                        colorAcento: '#b8860b',
                        colorFondoSuave: '#fffdf5',
                        iconoMedalla: 'fa-trophy',
                        textoMedalla: `GANADOR OFICIAL · ${infoPodio.etiquetaLugar}`,
                        tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                        subtituloCertificado: `${infoPodio.etiquetaLugar} — CATEGORÍA ${sp.catNombre.toUpperCase()}`,
                        cuerpoHTML: `Por haber obtenido el <b style="color:#b8860b;">${infoPodio.etiquetaLugar}</b> en la categoría <b>${sp.catNombre}</b> con el proyecto de innovación tecnológica:<br><b style="color:#002b5c; font-size:1.1em;">"${sp.titulo}"</b><br>alcanzando una calificación final ponderada de <b>${sp.notaFinal.toFixed(2)} / 100 puntos</b> en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
                    });
                }

                // Tipo 3: Premio Especial al Impacto Social (Criterio 5 - 15 pts)
                if (ganadorImpacto && ganadorImpacto.id === sp.id) {
                    certificadosDetectados.push({
                        tipo: 'premio_impacto',
                        botonLabel: '🌱 Premio Impacto Social',
                        colorPrimario: '#14532d',
                        colorAcento: '#16a34a',
                        colorFondoSuave: '#f4fdf7',
                        iconoMedalla: 'fa-seedling',
                        textoMedalla: 'PREMIO ESPECIAL · IMPACTO SOCIAL',
                        tituloCertificado: 'CERTIFICADO DE DISTINCIÓN ESPECIAL',
                        subtituloCertificado: 'PREMIO AL IMPACTO SOCIAL Y PRODUCTIVO (CRITERIO 5)',
                        cuerpoHTML: `Por haber obtenido la <b style="color:#15803d;">máxima calificación del Tribunal Evaluador en el Criterio de Impacto Social, Ambiental y Productivo (${sp.promImp.toFixed(2)} / 15 pts)</b> con el proyecto:<br><b style="color:#14532d; font-size:1.1em;">"${sp.titulo}"</b><br>destacándose por su aporte directo al desarrollo sostenible del departamento del Beni en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
                    });
                }

                // Tipo 4: Premio Especial a la Mayor Votación del Público
                if (ganadorPublico && ganadorPublico.id === sp.id) {
                    certificadosDetectados.push({
                        tipo: 'premio_publico',
                        botonLabel: '❤️ Premio Voto del Público',
                        colorPrimario: '#7f1d1d',
                        colorAcento: '#dc2626',
                        colorFondoSuave: '#fff8f8',
                        iconoMedalla: 'fa-heart',
                        textoMedalla: 'PREMIO ESPECIAL · VOTO DEL PÚBLICO',
                        tituloCertificado: 'CERTIFICADO DE DISTINCIÓN ESPECIAL',
                        subtituloCertificado: 'PREMIO A LA MAYOR VOTACIÓN DEL PÚBLICO ASISTENTE',
                        cuerpoHTML: `Por haberse consagrado como el proyecto favorito de la comunidad universitaria y ciudadanía, alcanzando la <b style="color:#dc2626;">mayor puntuación en la Votación Digital del Público (${sp.promPub.toFixed(2)} / 100 pts)</b> con la innovación:<br><b style="color:#7f1d1d; font-size:1.1em;">"${sp.titulo}"</b><br>en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
                    });
                }

                // Tipo 2: Certificado de Participación en la Feria
                certificadosDetectados.push({
                    tipo: 'participacion',
                    botonLabel: '🎓 Participación (Expositor)',
                    colorPrimario: '#002b5c',
                    colorAcento: '#0284c7',
                    colorFondoSuave: '#f8fbff',
                    iconoMedalla: 'fa-award',
                    textoMedalla: 'PARTICIPACIÓN OFICIAL · EXPOSITOR',
                    tituloCertificado: 'CERTIFICADO DE PARTICIPACIÓN',
                    subtituloCertificado: `EXPOSITOR(A) — CATEGORÍA ${sp.catNombre.toUpperCase()}`,
                    cuerpoHTML: `Por su destacada participación como <b>EXPOSITOR(A)</b> presentando el proyecto de investigación e innovación tecnológica:<br><b style="color:#002b5c; font-size:1.1em;">"${sp.titulo}"</b><br>en el evento académico y tecnológico <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollado el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
                });
            }
        });

        // PERFIL E: Colaboradores Oficiales (Tipo 5)
        const colabMatch = (colaboradores || []).find(c => coincidePersona(c.id, c.nombre_completo) || coincidePersona(c.celular, c.nombre_completo));
        if (colabMatch) {
            if (!personaNombre) personaNombre = colabMatch.nombre_completo;
            certificadosDetectados.unshift({
                tipo: 'colaborador',
                botonLabel: '🤝 Colaborador Oficial',
                colorPrimario: '#0f5132',
                colorAcento: '#0d9488',
                colorFondoSuave: '#f4fbfa',
                iconoMedalla: 'fa-hands-helping',
                textoMedalla: 'STAFF Y APOYO LOGÍSTICO OFICIAL',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'COLABORADOR OFICIAL Y PROMOCIÓN ACADÉMICA UABJB',
                cuerpoHTML: `Por su valioso compromiso y desempeño como <b>COLABORADOR(A) OFICIAL</b> en la logística del evento, guiando a los visitantes en el sistema de votación digital QR e impulsando la promoción de las nuevas carreras de la <b>Universidad Autónoma del Beni "José Ballivián"</b> durante la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            });
        }

        // PERFIL F: Expositor sin proyecto o Visitante general
        if (certificadosDetectados.length === 0) {
            const expMatch = (expositores || []).find(e => coincidePersona(e.ci, e.nombre_completo));
            const visMatch = (visitantes || []).find(v => coincidePersona(v.ci, v.nombre_completo));

            if (expMatch || visMatch) {
                const u = expMatch || visMatch;
                personaNombre = u.nombre_completo;
                certificadosDetectados.push({
                    tipo: 'participacion',
                    botonLabel: '🎓 Participación en la Feria',
                    colorPrimario: '#002b5c',
                    colorAcento: '#0284c7',
                    colorFondoSuave: '#f8fbff',
                    iconoMedalla: 'fa-award',
                    textoMedalla: 'PARTICIPACIÓN OFICIAL · TECNOFERIA 2026',
                    tituloCertificado: 'CERTIFICADO DE PARTICIPACIÓN',
                    subtituloCertificado: 'ASISTENCIA Y PARTICIPACIÓN ACADÉMICA',
                    cuerpoHTML: `Por su destacada participación en el evento de exposición académica, científica y tecnológica <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollado el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
                });
            }
        }

        // Si el usuario escribió un nombre libre que no estaba en BD (ej. un organizador o invitado nuevo), le abrimos el certificado con ese nombre
        if (certificadosDetectados.length === 0) {
            personaNombre = termRaw.toUpperCase();
            certificadosDetectados.push({
                tipo: 'participacion',
                botonLabel: '🎓 Participación General',
                colorPrimario: '#002b5c',
                colorAcento: '#0284c7',
                colorFondoSuave: '#f8fbff',
                iconoMedalla: 'fa-award',
                textoMedalla: 'PARTICIPACIÓN OFICIAL · TECNOFERIA 2026',
                tituloCertificado: 'CERTIFICADO DE PARTICIPACIÓN',
                subtituloCertificado: 'EXPOSICIÓN ACADÉMICA Y TECNOLÓGICA',
                cuerpoHTML: `Por su destacada participación en el evento de exposición académica y tecnológica <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollado el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            });
        }

        // 3. PLANTILLAS COMPLETAS DE LOS 8 CERTIFICADOS (Para poder alternar en vivo si se requiere)
        const plantillasManuales = [
            ...certificadosDetectados,
            {
                tipo: 'manual_ganador',
                botonLabel: '1. Ganador de Categoría (Estudiantes / Docentes)',
                colorPrimario: '#002b5c',
                colorAcento: '#b8860b',
                colorFondoSuave: '#fffdf5',
                iconoMedalla: 'fa-trophy',
                textoMedalla: 'GANADOR OFICIAL · 1° LUGAR',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: '1° LUGAR — CATEGORÍA ESTUDIANTES / DOCENTES',
                cuerpoHTML: `Por haber obtenido el <b style="color:#b8860b;">1° LUGAR</b> en su categoría con el proyecto de innovación tecnológica:<br><b style="color:#002b5c; font-size:1.1em;">"TÍTULO DEL PROYECTO (CLIC PARA EDITAR)"</b><br>en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_participacion',
                botonLabel: '2. Participación en la Feria (Expositores)',
                colorPrimario: '#002b5c',
                colorAcento: '#0284c7',
                colorFondoSuave: '#f8fbff',
                iconoMedalla: 'fa-award',
                textoMedalla: 'PARTICIPACIÓN OFICIAL · TECNOFERIA 2026',
                tituloCertificado: 'CERTIFICADO DE PARTICIPACIÓN',
                subtituloCertificado: 'EXPOSICIÓN ACADÉMICA Y TECNOLÓGICA',
                cuerpoHTML: `Por su destacada participación en el evento de exposición académica y tecnológica <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollado el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_impacto',
                botonLabel: '3. Premio Especial: Impacto Social (15 pts)',
                colorPrimario: '#14532d',
                colorAcento: '#16a34a',
                colorFondoSuave: '#f4fdf7',
                iconoMedalla: 'fa-seedling',
                textoMedalla: 'PREMIO ESPECIAL · IMPACTO SOCIAL',
                tituloCertificado: 'CERTIFICADO DE DISTINCIÓN ESPECIAL',
                subtituloCertificado: 'PREMIO AL IMPACTO SOCIAL Y PRODUCTIVO (CRITERIO 5)',
                cuerpoHTML: `Por haber obtenido la <b style="color:#15803d;">máxima calificación del Tribunal Evaluador en el Criterio de Impacto Social, Ambiental y Productivo (${ganadorImpacto ? ganadorImpacto.promImp.toFixed(2) : '15.00'} / 15 pts)</b> con el proyecto:<br><b style="color:#14532d; font-size:1.1em;">"${ganadorImpacto ? ganadorImpacto.titulo : 'TÍTULO DEL PROYECTO'}"</b><br>en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_publico',
                botonLabel: '4. Premio Especial: Mayor Votación del Público',
                colorPrimario: '#7f1d1d',
                colorAcento: '#dc2626',
                colorFondoSuave: '#fff8f8',
                iconoMedalla: 'fa-heart',
                textoMedalla: 'PREMIO ESPECIAL · VOTO DEL PÚBLICO',
                tituloCertificado: 'CERTIFICADO DE DISTINCIÓN ESPECIAL',
                subtituloCertificado: 'PREMIO A LA MAYOR VOTACIÓN DEL PÚBLICO ASISTENTE',
                cuerpoHTML: `Por haberse consagrado como el proyecto con la <b style="color:#dc2626;">mayor puntuación en la Votación Digital del Público (${ganadorPublico ? ganadorPublico.promPub.toFixed(2) : '98.82'} / 100 pts)</b> con la innovación:<br><b style="color:#7f1d1d; font-size:1.1em;">"${ganadorPublico ? ganadorPublico.titulo : 'TÍTULO DEL PROYECTO'}"</b><br>en la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_colaborador',
                botonLabel: '5. Colaboradores Oficiales (Apoyo y Promoción)',
                colorPrimario: '#0f5132',
                colorAcento: '#0d9488',
                colorFondoSuave: '#f4fbfa',
                iconoMedalla: 'fa-hands-helping',
                textoMedalla: 'STAFF Y APOYO LOGÍSTICO OFICIAL',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'COLABORADOR OFICIAL Y PROMOCIÓN ACADÉMICA UABJB',
                cuerpoHTML: `Por su valioso compromiso y desempeño como <b>COLABORADOR(A) OFICIAL</b> en la logística del evento, guiando a los visitantes en el sistema de votación digital QR e impulsando la promoción de las nuevas carreras de la <b>Universidad Autónoma del Beni "José Ballivián"</b> durante la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_tribunal',
                botonLabel: '6. Tribunales Evaluadores (Jurado Calificador)',
                colorPrimario: '#002b5c',
                colorAcento: '#b8860b',
                colorFondoSuave: '#fffdf5',
                iconoMedalla: 'fa-gavel',
                textoMedalla: 'COMITÉ EVALUADOR OFICIAL · JURADO CALIFICADOR',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'TRIBUNAL EVALUADOR OFICIAL DE PROYECTOS TECNOLÓGICOS',
                cuerpoHTML: `Por su valiosa contribución académica, rigor científico e imparcialidad en el desempeño de sus funciones como <b>TRIBUNAL EVALUADOR OFICIAL</b> en la calificación de los proyectos de investigación e innovación tecnológica de la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_organizador',
                botonLabel: '7. Comité Organizador del Evento',
                colorPrimario: '#1e1b4b',
                colorAcento: '#b8860b',
                colorFondoSuave: '#fefce8',
                iconoMedalla: 'fa-sitemap',
                textoMedalla: 'COMITÉ ORGANIZADOR OFICIAL · TECNOFERIA 2026',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO',
                subtituloCertificado: 'ORGANIZACIÓN Y DIRECCIÓN ACADÉMICA DEL EVENTO',
                cuerpoHTML: `Por su excelente liderazgo, planificación y compromiso como miembro del <b>COMITÉ ORGANIZADOR OFICIAL</b> en la realización de la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            },
            {
                tipo: 'manual_admin_sistema',
                botonLabel: '8. Administrador: Implementación del Sistema',
                colorPrimario: '#0f172a',
                colorAcento: '#0284c7',
                colorFondoSuave: '#f0f9ff',
                iconoMedalla: 'fa-laptop-code',
                textoMedalla: 'DESARROLLO E IMPLEMENTACIÓN TECNOLÓGICA',
                tituloCertificado: 'CERTIFICADO DE RECONOCIMIENTO ESPECIAL',
                subtituloCertificado: 'ADMINISTRACIÓN E IMPLEMENTACIÓN DE LA PLATAFORMA OFICIAL',
                cuerpoHTML: `Por su destacada labor en el diseño, desarrollo, administración e <b>implementación del Sistema Web Oficial de Gestión, Evaluación de Tribunales y Votación Digital por Código QR en Tiempo Real</b> para la <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>, desarrollada el 14 de Octubre de 2026 en el <b>${LUGAR_EVENTO}</b>.`
            }
        ];

        // Generar Código Aleatorio Único para el QR
        const codigoAleatorioInicial = generarCodigoAleatorioQR();
        const urlValidacion = `${window.location.origin}/?validar_certificado=${encodeURIComponent(codigoAleatorioInicial)}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlValidacion)}`;

        const logoUab = `${window.location.origin}/assets/img/OIP (2).png`;
        const logoCis = `${window.location.origin}/assets/img/LogoAcreditadaa.png`;
        const logoIisp = `${window.location.origin}/assets/img/logo_iisp.png`;

        const certInicial = certificadosDetectados[0];
        const ventanaCertificado = window.open('', '_blank');

        const botonesDetectadosHTML = certificadosDetectados.map((c, idx) => `
            <button type="button" class="btn-selector-cert ${idx === 0 ? 'activo' : ''}" onclick="cambiarModeloCertificado(${idx})">
                ${c.botonLabel}
            </button>
        `).join('');

        const opcionesManualesHTML = plantillasManuales.map((c, idx) => `
            <option value="${idx}">${idx < certificadosDetectados.length ? '✅ Detectado: ' : '📋 '}${c.botonLabel}</option>
        `).join('');

        ventanaCertificado.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Certificado Oficial - ${personaNombre}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,700&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    :root {
                        --cert-primario: ${certInicial.colorPrimario};
                        --cert-acento: ${certInicial.colorAcento};
                        --cert-fondo: ${certInicial.colorFondoSuave};
                    }

                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    body {
                        margin: 0;
                        padding: 85px 20px 30px;
                        background: #1e293b;
                        font-family: 'Montserrat', Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                    }

                    /* BARRA SUPERIOR DE CONTROL (SOLO EN PANTALLA, OCULTA AL IMPRIMIR) */
                    .barra-control-cert {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: rgba(15, 23, 42, 0.96);
                        backdrop-filter: blur(10px);
                        border-bottom: 2px solid #334155;
                        padding: 10px 24px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        z-index: 9999;
                        color: #fff;
                        flex-wrap: wrap;
                    }

                    .barra-izq {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    }

                    .badge-auto {
                        background: rgba(16, 185, 129, 0.2);
                        border: 1px solid #10b981;
                        color: #34d399;
                        padding: 5px 12px;
                        border-radius: 50px;
                        font-size: 0.76rem;
                        font-weight: 700;
                    }

                    .btn-selector-cert {
                        background: #334155;
                        color: #e2e8f0;
                        border: 1px solid #475569;
                        padding: 7px 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 0.8rem;
                        transition: 0.2s;
                    }

                    .btn-selector-cert.activo, .btn-selector-cert:hover {
                        background: #2563eb;
                        color: #ffffff;
                        border-color: #60a5fa;
                    }

                    .select-plantilla-manual {
                        background: #0f172a;
                        color: #f8fafc;
                        border: 1px solid #475569;
                        padding: 7px 12px;
                        border-radius: 8px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        outline: none;
                        cursor: pointer;
                    }

                    .btn-random-qr {
                        background: #0f172a;
                        color: #38bdf8;
                        border: 1px solid #0284c7;
                        padding: 7px 12px;
                        border-radius: 8px;
                        font-size: 0.8rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: 0.2s;
                    }

                    .btn-random-qr:hover {
                        background: #0284c7;
                        color: #ffffff;
                    }

                    .btn-imprimir-top {
                        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                        color: #ffffff;
                        border: none;
                        padding: 10px 22px;
                        border-radius: 50px;
                        font-weight: 800;
                        font-size: 0.9rem;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: 0.2s;
                    }

                    .btn-imprimir-top:hover {
                        transform: translateY(-2px);
                    }

                    /* LIENZO DEL CERTIFICADO EN PANTALLA */
                    .certificado-page-wrapper {
                        width: 279.4mm;
                        height: 205mm;
                        background: #ffffff;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 9mm;
                    }

                    .certificado-marco-externo {
                        width: 100%;
                        height: 100%;
                        border: 3px solid var(--cert-primario);
                        padding: 5px;
                        position: relative;
                        background: linear-gradient(135deg, #ffffff 0%, var(--cert-fondo) 50%, #ffffff 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .certificado-marco-interno {
                        width: 100%;
                        height: 100%;
                        border: 2px solid var(--cert-acento);
                        padding: 16px 32px 18px;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        text-align: center;
                        overflow: hidden;
                    }

                    /* ADORNOS DE ESQUINA */
                    .esquina-ornamento {
                        position: absolute;
                        width: 40px;
                        height: 40px;
                        border-color: var(--cert-acento);
                        border-style: solid;
                        z-index: 2;
                        pointer-events: none;
                    }
                    .esq-tl { top: 8px; left: 8px; border-width: 4px 0 0 4px; }
                    .esq-tr { top: 8px; right: 8px; border-width: 4px 4px 0 0; }
                    .esq-bl { bottom: 8px; left: 8px; border-width: 0 0 4px 4px; }
                    .esq-br { bottom: 8px; right: 8px; border-width: 0 4px 4px 0; }

                    .onda-decorativa-izq {
                        position: absolute;
                        top: -80px;
                        left: -80px;
                        width: 220px;
                        height: 220px;
                        border-radius: 50%;
                        background: radial-gradient(circle, var(--cert-primario) 0%, transparent 70%);
                        opacity: 0.08;
                        pointer-events: none;
                    }
                    .onda-decorativa-der {
                        position: absolute;
                        bottom: -80px;
                        right: -80px;
                        width: 240px;
                        height: 240px;
                        border-radius: 50%;
                        background: radial-gradient(circle, var(--cert-acento) 0%, transparent 70%);
                        opacity: 0.12;
                        pointer-events: none;
                    }

                    /* CABECERA CON LOGOS Y QR */
                    .cert-top-row {
                        display: grid;
                        grid-template-columns: 120px 1fr 120px;
                        align-items: center;
                        width: 100%;
                        position: relative;
                        z-index: 5;
                    }

                    .medalla-esquina-izq {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .medalla-circulo {
                        width: 62px;
                        height: 62px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, var(--cert-primario) 0%, #0f172a 100%);
                        border: 3px solid var(--cert-acento);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #fde047;
                        font-size: 1.65rem;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.18);
                    }

                    .header-logos {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 32px;
                    }

                    .header-logos img {
                        height: 66px;
                        object-fit: contain;
                    }

                    .qr-zone {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .qr-zone img {
                        width: 72px;
                        height: 72px;
                        border: 1.5px solid var(--cert-acento);
                        padding: 3px;
                        background: #ffffff;
                        border-radius: 6px;
                    }

                    .qr-zone span {
                        font-size: 8.5px;
                        color: var(--cert-primario);
                        margin-top: 4px;
                        font-weight: 800;
                        letter-spacing: 0.4px;
                        font-family: 'Montserrat', monospace;
                    }

                    /* CUERPO CENTRAL */
                    .cert-center-body {
                        position: relative;
                        z-index: 5;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        flex: 1;
                        padding: 2px 15px;
                    }

                    .texto-institucional {
                        font-size: 0.86rem;
                        color: #334155;
                        margin: 0 0 6px;
                        font-weight: 600;
                        letter-spacing: 0.2px;
                        line-height: 1.35;
                    }

                    .insignia-categoria {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--cert-primario);
                        color: #ffffff;
                        padding: 4px 18px;
                        border-radius: 50px;
                        font-size: 0.73rem;
                        font-weight: 800;
                        letter-spacing: 1.2px;
                        text-transform: uppercase;
                        border: 1.5px solid var(--cert-acento);
                        margin-bottom: 5px;
                    }

                    h1.titulo-cert {
                        font-family: 'Cinzel', 'Georgia', serif;
                        font-size: 2.25rem;
                        color: var(--cert-primario);
                        margin: 2px 0;
                        font-weight: 800;
                        letter-spacing: 2px;
                        line-height: 1.08;
                    }

                    .subtitulo-cert {
                        font-size: 0.88rem;
                        font-weight: 800;
                        color: var(--cert-acento);
                        letter-spacing: 1.4px;
                        text-transform: uppercase;
                        margin: 2px 0 6px;
                    }

                    .otorgado-a-label {
                        font-size: 0.76rem;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-weight: 700;
                        margin: 0;
                    }

                    .editable-name {
                        font-family: 'Playfair Display', 'Georgia', serif;
                        font-size: 2.05rem;
                        font-weight: 700;
                        font-style: italic;
                        color: #0f172a;
                        border-bottom: 2px solid var(--cert-acento);
                        display: inline-block;
                        min-width: 60%;
                        max-width: 92%;
                        padding: 1px 20px 4px;
                        margin: 2px 0 8px;
                        outline: none;
                    }

                    .editable-name:focus, .body-text:focus, .subtitulo-cert:focus {
                        background: rgba(77, 184, 255, 0.12);
                        border-radius: 6px;
                    }

                    .body-text {
                        font-size: 0.94rem;
                        color: #1e293b;
                        line-height: 1.48;
                        max-width: 90%;
                        margin: 0 auto 6px;
                        outline: none;
                    }

                    .fecha-lugar {
                        font-size: 0.84rem;
                        color: #475569;
                        font-weight: 600;
                        margin: 2px 0 0;
                    }

                    /* 🔥 FIRMAS PERFECTAMENTE ALINEADAS EN LA MISMA LÍNEA HORIZONTAL 🔥 */
                    .firmas-container {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        align-items: flex-start;
                        justify-items: center;
                        gap: 24px;
                        width: 100%;
                        padding: 0 18px;
                        margin-top: 18px;
                        position: relative;
                        z-index: 5;
                    }

                    .firma-bloque {
                        text-align: center;
                        border-top: 1.8px solid #0f172a;
                        width: 100%;
                        max-width: 240px;
                        padding-top: 7px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                    }

                    .firma-bloque h4 {
                        margin: 0;
                        font-size: 0.75rem;
                        color: #0f172a;
                        font-weight: 800;
                        line-height: 1.25;
                        white-space: nowrap;
                    }

                    .firma-bloque p {
                        margin: 3px 0 0;
                        font-size: 0.68rem;
                        color: #475569;
                        font-weight: 700;
                        line-height: 1.2;
                    }

                    /* =========================================================================
                       🖨️ REGLAS DE IMPRESIÓN PERFECTA EN 1 SOLA PÁGINA (CUALQUIER HOJA)
                       ========================================================================= */
                    @media print {
                        @page {
                            size: landscape;
                            margin: 0mm;
                        }

                        html, body {
                            width: 100vw !important;
                            height: 100vh !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                            overflow: hidden !important;
                            display: block !important;
                        }

                        .no-print {
                            display: none !important;
                        }

                        .certificado-page-wrapper {
                            width: 100vw !important;
                            height: 100vh !important;
                            max-width: 100vw !important;
                            max-height: 100vh !important;
                            margin: 0 !important;
                            padding: 7mm 9mm !important;
                            box-shadow: none !important;
                            page-break-inside: avoid !important;
                            page-break-after: avoid !important;
                            page-break-before: avoid !important;
                            break-inside: avoid !important;
                            overflow: hidden !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="barra-control-cert no-print">
                    <div class="barra-izq">
                        <span class="badge-auto"><i class="fas fa-magic"></i> Auto-Detectado</span>
                        ${botonesDetectadosHTML}
                        <select class="select-plantilla-manual" onchange="cambiarModeloCertificado(this.value)" title="Cambiar entre los 8 modelos de certificado">
                            ${opcionesManualesHTML}
                        </select>
                        <button type="button" class="btn-random-qr" onclick="regenerarCodigoQR()" title="Generar otro código aleatorio para el QR">
                            <i class="fas fa-random"></i> Nuevo Código QR
                        </button>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:0.76rem; color:#94a3b8;"><i class="fas fa-pen"></i> Textos editables con un clic</span>
                        <button type="button" class="btn-imprimir-top" onclick="window.print()">
                            <i class="fas fa-print"></i> Imprimir en 1 Hoja
                        </button>
                    </div>
                </div>

                <div class="certificado-page-wrapper">
                    <div class="certificado-marco-externo">
                        <div class="certificado-marco-interno">
                            <div class="esquina-ornamento esq-tl"></div>
                            <div class="esquina-ornamento esq-tr"></div>
                            <div class="esquina-ornamento esq-bl"></div>
                            <div class="esquina-ornamento esq-br"></div>
                            <div class="onda-decorativa-izq"></div>
                            <div class="onda-decorativa-der"></div>

                            <div class="cert-top-row">
                                <div class="medalla-esquina-izq">
                                    <div class="medalla-circulo">
                                        <i id="cert-icono-medalla" class="fas ${certInicial.iconoMedalla}"></i>
                                    </div>
                                </div>

                                <div class="header-logos">
                                    <img src="${logoUab}" alt="Escudo UABJB" onerror="this.style.display='none'">
                                    <img src="${logoCis}" alt="Escudo Carrera Sistemas" onerror="this.style.display='none'">
                                    <img src="${logoIisp}" alt="Escudo IISP" onerror="this.style.display='none'">
                                </div>

                                <div class="qr-zone">
                                    <img id="cert-qr-img" src="${qrUrl}" alt="QR Validación">
                                    <span id="cert-qr-code-text" contenteditable="true" spellcheck="false">ID: ${codigoAleatorioInicial}</span>
                                </div>
                            </div>

                            <div class="cert-center-body">
                                <p class="texto-institucional">
                                    La <b>Universidad Autónoma del Beni "José Ballivián"</b>, a través de la Facultad de Ingeniería y Tecnología,<br>
                                    la Carrera de Ingeniería de Sistemas y el Instituto de Investigación Interacción Social y Posgrado (I.I.S.P.), confiere el presente:
                                </p>

                                <div id="cert-badge-medalla" class="insignia-categoria" contenteditable="true" spellcheck="false">
                                    ${certInicial.textoMedalla}
                                </div>

                                <h1 id="cert-titulo-principal" class="titulo-cert" contenteditable="true" spellcheck="false">
                                    ${certInicial.tituloCertificado}
                                </h1>

                                <div id="cert-subtitulo" class="subtitulo-cert" contenteditable="true" spellcheck="false">
                                    ${certInicial.subtituloCertificado}
                                </div>

                                <p class="otorgado-a-label">Otorgado a:</p>

                                <div class="editable-name" contenteditable="true" spellcheck="false" title="Haz clic para editar el nombre">
                                    ${personaNombre}
                                </div>

                                <div id="cert-cuerpo-texto" class="body-text" contenteditable="true" spellcheck="false" title="Haz clic para editar el detalle">
                                    ${certInicial.cuerpoHTML}
                                </div>

                                <p class="fecha-lugar" contenteditable="true" spellcheck="false">
                                    Trinidad - Beni, Octubre de 2026
                                </p>
                            </div>

                            <div class="firmas-container">
                                <div class="firma-bloque">
                                    <h4>M.SC. SAUD YUJA GÓMEZ</h4>
                                    <p>DECANO F.I.T. - U.A.B.J.B.</p>
                                </div>
                                <div class="firma-bloque">
                                    <h4>M.SC. EDUARDO S. MORALES BARROSO</h4>
                                    <p>DIRECTOR DE CARRERA C.I.S.</p>
                                </div>
                                <div class="firma-bloque">
                                    <h4>M.SC. LIC. WILLIAM CHAO RIVERO</h4>
                                    <p>RESP. INSTITUTO DE INVESTIGACIÓN I.I.S.P.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    const MODELOS_CERT = ${JSON.stringify(plantillasManuales)};
                    const ORIGEN_URL = ${JSON.stringify(window.location.origin)};

                    function generarNuevoCodigo() {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let b1 = '', b2 = '';
                        for (let i = 0; i < 4; i++) b1 += chars.charAt(Math.floor(Math.random() * chars.length));
                        for (let i = 0; i < 4; i++) b2 += chars.charAt(Math.floor(Math.random() * chars.length));
                        return 'TF26-' + b1 + '-' + b2;
                    }

                    function regenerarCodigoQR() {
                        const nuevoCod = generarNuevoCodigo();
                        const nuevaUrl = ORIGEN_URL + '/?validar_certificado=' + encodeURIComponent(nuevoCod);
                        document.getElementById('cert-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(nuevaUrl);
                        document.getElementById('cert-qr-code-text').textContent = 'ID: ' + nuevoCod;
                    }

                    function cambiarModeloCertificado(indice) {
                        const m = MODELOS_CERT[indice];
                        if (!m) return;
                        document.documentElement.style.setProperty('--cert-primario', m.colorPrimario);
                        document.documentElement.style.setProperty('--cert-acento', m.colorAcento);
                        document.documentElement.style.setProperty('--cert-fondo', m.colorFondoSuave);

                        document.getElementById('cert-icono-medalla').className = 'fas ' + m.iconoMedalla;
                        document.getElementById('cert-badge-medalla').innerHTML = m.textoMedalla;
                        document.getElementById('cert-titulo-principal').innerHTML = m.tituloCertificado;
                        document.getElementById('cert-subtitulo').innerHTML = m.subtituloCertificado;
                        document.getElementById('cert-cuerpo-texto').innerHTML = m.cuerpoHTML;

                        document.querySelectorAll('.btn-selector-cert').forEach((b, i) => {
                            b.classList.toggle('activo', i === Number(indice));
                        });
                        const sel = document.querySelector('.select-plantilla-manual');
                        if (sel) sel.value = String(indice);
                        regenerarCodigoQR();
                    }
                <\/script>
            </body>
            </html>
        `);
        ventanaCertificado.document.close();

    } catch (error) {
        console.error(error);
        alert("❌ Ocurrió un error al intentar generar el certificado.");
    }
};

window.generarVistaPrevia = async function() {
    const tipoSelect = document.getElementById('tipo-informe-select');
    const valor = tipoSelect.value;
    const areaImpresion = document.getElementById('informe-impresion');
    const btn = document.querySelector('#informes .btn-save');

    if (!valor) return;

    if (valor === "certificado") {
        areaImpresion.style.display = 'block';
        areaImpresion.innerHTML = `
            <div style="text-align: center; padding: 35px 25px; color: #002b5c; background: #e8f4fd; border-radius: 10px; border: 2px dashed #0284c7; font-family: Arial, sans-serif;">
                <i class="fas fa-award fa-4x" style="margin-bottom:15px; color: #0284c7;"></i>
                <h3 style="margin-top: 0; color: #002b5c !important; font-size: 1.4rem;">Sistema Inteligente de 8 Certificados Oficiales (QR Único)</h3>
                <p style="color: #1e293b !important; font-size: 1rem; max-width: 680px; margin: 10px auto 15px; line-height: 1.5;">
                    Escriba el <b>C.I. o Nombre Completo</b> arriba y presione <b>"Procesar Documento"</b>.<br>
                    El sistema detectará el rol de la persona y generará un código aleatorio único para su QR:
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px;">
                    <span style="background:#fffdf5; border:1px solid #b8860b; color:#002b5c; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">🏆 1. Ganadores de Categoría</span>
                    <span style="background:#f8fbff; border:1px solid #0284c7; color:#002b5c; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">🎓 2. Participación en la Feria</span>
                    <span style="background:#f4fdf7; border:1px solid #16a34a; color:#14532d; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">🌱 3. Premio Impacto Social (15 pts)</span>
                    <span style="background:#fff8f8; border:1px solid #dc2626; color:#7f1d1d; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">❤️ 4. Mayor Votación del Público</span>
                    <span style="background:#f4fbfa; border:1px solid #0d9488; color:#0f5132; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">🤝 5. Colaboradores Oficiales</span>
                    <span style="background:#fffdf5; border:1px solid #b8860b; color:#002b5c; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">⚖️ 6. Tribunales Evaluadores</span>
                    <span style="background:#fefce8; border:1px solid #b8860b; color:#1e1b4b; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">🏛️ 7. Comité Organizador</span>
                    <span style="background:#f0f9ff; border:1px solid #0284c7; color:#0f172a; padding:6px 12px; border-radius:50px; font-size:0.8rem; font-weight:bold;">💻 8. Implementación del Sistema (Admin)</span>
                </div>
            </div>
        `;
        if (btn) { btn.innerHTML = '<i class="fas fa-cogs"></i> Procesar Documento'; btn.disabled = false; }
        return;
    }

    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando Vista Previa...'; btn.disabled = true; }

    areaImpresion.style.display = 'block';
    areaImpresion.innerHTML = '<div style="text-align: center; padding: 40px; color: #333;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 15px; font-weight: bold;">Generando vista previa del documento...</p></div>';

    try {
        const res = await fetch('/api/datos_informes');
        const db = await res.json();
        const { proyectos, expositores, tribunales, visitantes, votos, evaluaciones, colaboradores } = db;

        // 🔥 DICCIONARIO CENTRALIZADO CON EL ORDEN OFICIAL EXACTO 🔥
        const { proyectosValidos: proyectosValidosGlobales, mapa: mapeoNumerosGlobales } = construirMapaNumerosOficiales(proyectos);

        const obtenerRolesDeProyectos = (ci, nombre) => {
            const roles = [];
            const ciStr = String(ci).trim();
            const nomStr = (nombre || "").toLowerCase().trim();

            for (const p of proyectos) {
                if (p.estado_evaluacion === 'Evaluado (No clasifica)') continue; 
                
                if (String(p.ci_propietario).trim() === ciStr) {
                    roles.push({ tipo: 'LIDER', proyecto: p });
                    continue; 
                }

                let esCoExpositor = false;
                const rawText = (p.integrantes || "").toLowerCase();

                if (p.integrantes && p.integrantes.includes('|||')) {
                    try {
                        const arrInts = JSON.parse(p.integrantes.split('|||')[1].trim());
                        if (arrInts.some(m => String(m.ci).trim() === ciStr)) {
                            esCoExpositor = true;
                        }
                    } catch(e) {}
                }

                if (!esCoExpositor && rawText.includes(ciStr)) esCoExpositor = true;
                if (!esCoExpositor && nomStr.length > 4 && rawText.includes(nomStr)) esCoExpositor = true;

                if (!esCoExpositor && nomStr.length > 4) {
                    const partesNombre = nomStr.split(/\s+/);
                    if (partesNombre.length >= 2) {
                        const combo1 = partesNombre[0] + " " + partesNombre[1]; 
                        const combo2 = partesNombre[0] + " " + partesNombre[partesNombre.length - 1]; 
                        if (combo1.length > 5 && rawText.includes(combo1)) esCoExpositor = true;
                        if (combo2.length > 5 && rawText.includes(combo2)) esCoExpositor = true;
                    }
                }

                if (esCoExpositor) roles.push({ tipo: 'CO-EXPOSITOR', proyecto: p });
            }
            return roles;
        };

        if (valor === 'terna') {
            let html = `<div style="text-align:center; margin-bottom:20px;">
                            <h2 style="color:#002b5c; margin-bottom:5px;">ACTA DE ASIGNACIÓN DE TERNAS Y TRIBUNALES</h2>
                            <p style="font-size:0.9rem; color:#666;">Distribución oficial de proyectos por jurado evaluador.</p>
                        </div>`;
                        
            const tribunalesActivos = tribunales.filter(t => t.proyectos_asignados && t.proyectos_asignados !== "[]");
            
            if (tribunalesActivos.length === 0) {
                html += `<p style="text-align:center; color:red; font-weight:bold;">Aún no se han asignado proyectos a ningún tribunal.</p>`;
            } else {
                const categorias = [
                    { id: 'estudiante', nombre: '1. ESTUDIANTES UNIVERSITARIOS' },
                    { id: 'docente', nombre: '2. DOCENTES INVESTIGADORES' },
                    { id: 'emprendimiento', nombre: '3. EMPRENDIMIENTOS TECNOLÓGICOS' }
                ];

                categorias.forEach(cat => {
                    html += `<h3 style="background:#002b5c; color:white; padding:10px; margin-top:30px; border-radius:4px;">${cat.nombre}</h3>`;
                    
                    let hayTribunalesEnEstaCat = false;

                    tribunalesActivos.forEach(trib => {
                        let catAsignadas = [];
                        let proyAsignados = [];
                        try { catAsignadas = JSON.parse(trib.categoria_asignada || "[]"); } catch(e){}
                        try { proyAsignados = JSON.parse(trib.proyectos_asignados || "[]"); } catch(e){}
                        
                        if (catAsignadas.includes(cat.id)) {
                            hayTribunalesEnEstaCat = true;
                            html += `
                                <div style="margin-top: 20px; padding: 15px; border: 2px solid #ddd; border-radius: 8px; page-break-inside: avoid;">
                                    <h4 style="color:#d32f2f; margin-bottom:5px; border-bottom:1px solid #ccc; padding-bottom:5px;">
                                        <i class="fas fa-gavel"></i> Tribunal: ${trib.nombre_completo}
                                    </h4>
                                    <p style="font-size:0.85rem; color:#555; margin-bottom:15px;"><strong>Correo:</strong> ${trib.correo} | <strong>Celular:</strong> ${trib.celular}</p>
                                    
                                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; page-break-inside: auto;">
                                        <thead>
                                            <tr style="background:#f1f1f1; text-align:left;">
                                                <th style="padding:8px; border:1px solid #ccc; width:10%; text-align:center;">Nº Asignado</th>
                                                <th style="padding:8px; border:1px solid #ccc; width:45%;">Título del Proyecto</th>
                                                <th style="padding:8px; border:1px solid #ccc; width:45%;">Líder y Equipo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;

                            const proyectosDeEsteTribunal = proyAsignados
                                .map(idProy => proyectosValidosGlobales.find(p => String(p.id) === String(idProy) && (p.categoria || "").toLowerCase().includes(cat.id)))
                                .filter(p => p !== undefined);

                            proyectosDeEsteTribunal.sort((a, b) => (mapeoNumerosGlobales[String(a.id)] || 999) - (mapeoNumerosGlobales[String(b.id)] || 999));

                            proyectosDeEsteTribunal.forEach(proyectoDetalle => {
                                let cleanIntegrantes = (proyectoDetalle.integrantes || "").replace(/⭐ LÍDER:/g, '<b>Líder:</b>')
                                                                                .replace(/👥 EQUIPO:/g, '<br><b>Equipo:</b>')
                                                                                .replace(/\|\|\|.*/g, ''); 
                                html += `
                                    <tr style="page-break-inside: avoid;">
                                        <td style="padding:8px; border:1px solid #ccc; text-align:center; font-weight:bold; font-size:1.1rem; color:#002b5c; background:#f9f9f9;">#${mapeoNumerosGlobales[String(proyectoDetalle.id)]}</td>
                                        <td style="padding:8px; border:1px solid #ccc;">${proyectoDetalle.titulo}</td>
                                        <td style="padding:8px; border:1px solid #ccc;">${cleanIntegrantes}</td>
                                    </tr>
                                `;
                            });

                            if (proyectosDeEsteTribunal.length === 0) {
                                html += `<tr><td colspan="3" style="padding:8px; border:1px solid #ccc; text-align:center; font-style:italic; color:#777;">No se le han marcado proyectos específicos en esta categoría.</td></tr>`;
                            }

                            html += `</tbody></table></div>`;
                        }
                    });

                    if (!hayTribunalesEnEstaCat) {
                        html += `<p style="padding:15px; font-style:italic; color:#666;">No hay tribunales asignados a esta categoría todavía.</p>`;
                    }
                });
            }
            areaImpresion.innerHTML = generarCabeceraOficial("ACTA OFICIAL DE TERNA ASIGNADA") + html + `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;"><div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador I.I.S.P.</p></div><div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div></div>`;
        }

        else if (valor === "ranking") {
            const diccionarioProyectos = {}; 

            proyectos.forEach(p => {
                if (p.estado_evaluacion === "Evaluado" || p.estado_evaluacion === "Pre-seleccionado") {
                    let catName = (p.categoria || "").includes('estudiante') ? "proyectos_estudiantes" : (p.categoria || "").includes('docente') ? "proyectos_docentes" : "proyectos_emprendimientos";
                    let nombreLiderReal = "Desconocido";
                    const expLider = expositores.find(e => e.ci === p.ci_propietario);
                    if(expLider) nombreLiderReal = expLider.nombre_completo;

                    diccionarioProyectos[p.id] = { titulo: p.titulo || "Sin Título", integrantes: extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim(), nombreLiderReal), categoria: catName, sumaTribunal: 0, cantidadTribunal: 0, sumaPublico: 0, cantidadPublico: 0 };
                }
            });

            evaluaciones.forEach(ev => {
                if (diccionarioProyectos[ev.id_proyecto]) {
                    diccionarioProyectos[ev.id_proyecto].sumaTribunal += (parseFloat(ev.nota) || 0);
                    diccionarioProyectos[ev.id_proyecto].cantidadTribunal += 1;
                }
            });

            votos.forEach(v => {
                if (diccionarioProyectos[v.id_proyecto]) {
                    let notaP = parseFloat(v.nota) || 0; 
                    if (notaP > 100) notaP = 100;
                    diccionarioProyectos[v.id_proyecto].sumaPublico += notaP;
                    diccionarioProyectos[v.id_proyecto].cantidadPublico += 1;
                }
            });

            const [topEstudiantes, topDocentes, topEmprendimientos] = [[], [], []];

            Object.values(diccionarioProyectos).forEach(proy => {
                const pT = proy.cantidadTribunal > 0 ? (proy.sumaTribunal / proy.cantidadTribunal) : 0;
                const pP = proy.cantidadPublico > 0 ? (proy.sumaPublico / proy.cantidadPublico) : 0;
                const notaF = (pT * 0.80) + (pP * 0.20);
                const obj = { titulo: proy.titulo, integrantes: proy.integrantes, notaFinal: notaF };
                
                if (proy.categoria === "proyectos_estudiantes") topEstudiantes.push(obj);
                if (proy.categoria === "proyectos_docentes") topDocentes.push(obj);
                if (proy.categoria === "proyectos_emprendimientos") topEmprendimientos.push(obj);
            });

            const ordenar = (a, b) => b.notaFinal - a.notaFinal;
            topEstudiantes.sort(ordenar); topDocentes.sort(ordenar); topEmprendimientos.sort(ordenar);

            const generarTablaHTML = (tituloCat, datos) => {
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 12%;">Posición</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 38%;">Nombre del Proyecto</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 35%;">Expositor / Responsable</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Nota Final</th>
                            </tr>
                        </thead><tbody>`;
                if (datos.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay proyectos.</td></tr>`; } 
                else {
                    datos.forEach((p, index) => {
                        const lugar = index + 1;
                        let colorFondo = (lugar === 1 && p.notaFinal > 0) ? "#fff9e6" : (lugar === 2 && p.notaFinal > 0) ? "#f2f2f2" : (lugar === 3 && p.notaFinal > 0) ? "#ffe6e6" : "#fff";
                        html += `<tr>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; background-color: ${colorFondo};">${lugar}° LUGAR</td>
                            <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${p.titulo}</td>
                            <td style="padding: 10px; border: 1px solid #ccc;">${p.integrantes}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px;">${p.notaFinal.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("CUADRO DE HONOR Y RANKING GENERAL") + 
                generarTablaHTML("1. ESTUDIANTES UNIVERSITARIOS", topEstudiantes) +
                generarTablaHTML("2. DOCENTES INVESTIGADORES", topDocentes) +
                generarTablaHTML("3. EMPRENDIMIENTOS TECNOLÓGICOS", topEmprendimientos) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div>
                </div>`;
        } 

        else if (valor === "premios_especiales") {
            const diccionarioPremios = {};
            proyectos.forEach(p => {
                if (p.estado_evaluacion === "Evaluado" || p.estado_evaluacion === "Pre-seleccionado") {
                    diccionarioPremios[p.id] = {
                        titulo: p.titulo || "Sin Título",
                        nota_impacto: parseFloat(p.nota_impacto) || 0,
                        sumaPublico: 0,
                        cantidadPublico: 0
                    };
                }
            });

            votos.forEach(v => {
                if (diccionarioPremios[v.id_proyecto]) {
                    diccionarioPremios[v.id_proyecto].sumaPublico += Math.min(parseFloat(v.nota) || 0, 100);
                    diccionarioPremios[v.id_proyecto].cantidadPublico += 1;
                }
            });

            const listaPremios = Object.values(diccionarioPremios).map(p => ({
                titulo: p.titulo,
                nota_impacto: p.nota_impacto,
                promedio_publico: p.cantidadPublico > 0 ? p.sumaPublico / p.cantidadPublico : 0
            }));

            const premioImpacto = [...listaPremios].sort((a, b) => b.nota_impacto - a.nota_impacto)[0];
            const premioPublico = [...listaPremios].sort((a, b) => b.promedio_publico - a.promedio_publico)[0];

            let htmlPremios = "";
            
            if (premioImpacto && premioImpacto.nota_impacto > 0) {
                htmlPremios += `
                    <div style="border: 2px solid #28a745; padding: 25px; border-radius: 8px; margin-bottom: 40px; background-color: #f8fff9;">
                        <h3 style="color: #28a745; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px; font-family: Arial, sans-serif;">🏆 PREMIO AL IMPACTO SOCIAL Y PRODUCTIVO</h3>
                        <p style="font-family: Arial, sans-serif; font-size: 15px; margin-bottom: 15px; color: #333;"><strong>Proyecto Ganador:</strong> <span style="font-size: 17px; color: #000;">${premioImpacto.titulo}</span></p>
                        <p style="font-family: Arial, sans-serif; font-size: 15px; margin-bottom: 0; color: #333;"><strong>Calificación Promedio del Tribunal:</strong> <span style="font-weight: bold; font-size: 18px; color: #28a745;">${premioImpacto.nota_impacto.toFixed(2)} / 15 pts</span></p>
                    </div>
                `;
            } else {
                htmlPremios += `<p style="font-family: Arial, sans-serif; color: #666; text-align: center;">No hay ganador de Impacto Social aún.</p>`;
            }

            if (premioPublico && premioPublico.promedio_publico > 0) {
                htmlPremios += `
                    <div style="border: 2px solid #dc3545; padding: 25px; border-radius: 8px; margin-bottom: 30px; background-color: #fff8f9;">
                        <h3 style="color: #dc3545; margin-top: 0; border-bottom: 2px solid #dc3545; padding-bottom: 10px; font-family: Arial, sans-serif;">🏆 PREMIO DEL PÚBLICO (VOTACIÓN ASISTENTES)</h3>
                        <p style="font-family: Arial, sans-serif; font-size: 15px; margin-bottom: 15px; color: #333;"><strong>Proyecto Ganador:</strong> <span style="font-size: 17px; color: #000;">${premioPublico.titulo}</span></p>
                        <p style="font-family: Arial, sans-serif; font-size: 15px; margin-bottom: 0; color: #333;"><strong>Promedio de Votos:</strong> <span style="font-weight: bold; font-size: 18px; color: #dc3545;">${premioPublico.promedio_publico.toFixed(2)} / 100 pts</span></p>
                    </div>
                `;
            } else {
                htmlPremios += `<p style="font-family: Arial, sans-serif; color: #666; text-align: center;">No hay ganador del Público aún.</p>`;
            }

            areaImpresion.innerHTML = generarCabeceraOficial("ACTA DE GANADORES: PREMIOS ESPECIALES", "Este reporte certifica a los proyectos ganadores en las categorías especiales, obtenidos mediante el promedio general del jurado (Impacto Social) y el promedio directo de la votación externa (Público).") + htmlPremios + `
                <div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div>
                </div>`;
        }

        else if (valor === "detalle_impacto") {
            const grupos = { 
                "1. ESTUDIANTES UNIVERSITARIOS": [], 
                "2. DOCENTES INVESTIGADORES": [], 
                "3. EMPRENDIMIENTOS TECNOLÓGICOS": [] 
            };

            const proyectosImpacto = {};

            evaluaciones.forEach(ev => {
                const proy = proyectos.find(p => p.id === ev.id_proyecto);
                if (proy && proy.estado_evaluacion !== 'Evaluado (No clasifica)') {
                    let cat = (proy.categoria || "").includes('estudiante') 
                        ? "1. ESTUDIANTES UNIVERSITARIOS" 
                        : (proy.categoria || "").includes('docente') 
                            ? "2. DOCENTES INVESTIGADORES" 
                            : "3. EMPRENDIMIENTOS TECNOLÓGICOS";

                    if (!proyectosImpacto[proy.id]) {
                        let nombreLiderReal = "Desconocido";
                        const expLider = expositores.find(e => String(e.ci).trim() === String(proy.ci_propietario).trim());
                        if (expLider) nombreLiderReal = expLider.nombre_completo;

                        const soloLider = extraerSoloLiderDeProyecto(proy.integrantes, nombreLiderReal);

                        proyectosImpacto[proy.id] = {
                            id: proy.id,
                            titulo: proy.titulo || "Sin Título",
                            lider: soloLider,
                            categoria: cat,
                            numGlobal: mapeoNumerosGlobales[String(proy.id)] || "N/A",
                            evaluaciones: [],
                            sumaImpacto: 0
                        };
                        grupos[cat].push(proyectosImpacto[proy.id]);
                    }

                    const trib = tribunales.find(t => t.usuario_tribunal === ev.usuario_tribunal);
                    let nombreTribunalReal = trib ? trib.nombre_completo : (ev.usuario_tribunal || "Evaluador");
                    if (!nombreTribunalReal.toLowerCase().startsWith('ing')) nombreTribunalReal = "Ing. " + nombreTribunalReal;

                    const ptsImpacto = parseFloat(ev.nota_impacto) || 0;
                    proyectosImpacto[proy.id].sumaImpacto += ptsImpacto;

                    proyectosImpacto[proy.id].evaluaciones.push({
                        nombreTribunal: nombreTribunalReal,
                        notaImpacto: ptsImpacto.toFixed(2)
                    });
                }
            });

            let maxPromedioGlobal = 0;
            Object.values(proyectosImpacto).forEach(p => {
                p.promedioImpacto = p.evaluaciones.length > 0 ? (p.sumaImpacto / p.evaluaciones.length) : 0;
                if (p.promedioImpacto > maxPromedioGlobal) maxPromedioGlobal = p.promedioImpacto;
            });

            const generarTablaImpacto = (tituloCat, listaProyectos) => {
                listaProyectos.sort((a, b) => (a.numGlobal === "N/A" ? 999 : a.numGlobal) - (b.numGlobal === "N/A" ? 999 : b.numGlobal));

                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 6%;">Nº</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 32%;">Título del Proyecto</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 22%;">Líder del Proyecto</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 20%;">Tribunal Evaluador</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Criterio 5 (Máx 15)</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Promedio Impacto</th>
                            </tr>
                        </thead><tbody>`;

                if (listaProyectos.length === 0) {
                    html += `<tr><td colspan="6" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay evaluaciones de impacto registradas en esta categoría.</td></tr>`;
                } else {
                    listaProyectos.forEach(proy => {
                        const numEvals = proy.evaluaciones.length;
                        if (numEvals === 0) return;

                        const esMaximo = maxPromedioGlobal > 0 && Math.abs(proy.promedioImpacto - maxPromedioGlobal) < 0.001;
                        const bgPromedio = esMaximo ? "#e8f8ee" : "#f9f9f9";
                        const colorPromedio = esMaximo ? "#198754" : "#002b5c";

                        proy.evaluaciones.forEach((ev, idx) => {
                            html += `<tr style="page-break-inside: avoid;">`;
                            if (idx === 0) {
                                html += `
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 1.1rem; color: #002b5c; background: #f9f9f9; vertical-align: middle;">#${proy.numGlobal}</td>
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; font-weight: bold; color: #002b5c; vertical-align: middle;">${proy.titulo}</td>
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; vertical-align: middle;"><strong>Líder:</strong> ${proy.lider}</td>
                                `;
                            }
                            html += `
                                    <td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${ev.nombreTribunal}</td>
                                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 12px;">${ev.notaImpacto} / 15</td>
                            `;
                            if (idx === 0) {
                                html += `
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 13px; color: ${colorPromedio}; background: ${bgPromedio}; vertical-align: middle;">
                                        ${proy.promedioImpacto.toFixed(2)} / 15
                                        ${esMaximo ? `<br><span style="font-size: 9px; color: #198754; text-transform: uppercase;">★ Mayor Puntaje</span>` : ''}
                                    </td>
                                `;
                            }
                            html += `</tr>`;
                        });
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial(
                "DETALLE DE CALIFICACIONES DE TRIBUNALES: PREMIO AL IMPACTO SOCIAL (CRITERIO 5)", 
                "Este informe desglosa el puntaje otorgado por cada miembro del Tribunal Evaluador específicamente en el Criterio 5 de la rúbrica oficial (Impacto social, ambiental o productivo, sobre un máximo de 15 puntos), manteniendo la numeración oficial de proyectos y su respectivo Líder."
            ) + 
            generarTablaImpacto("1. ESTUDIANTES UNIVERSITARIOS", grupos["1. ESTUDIANTES UNIVERSITARIOS"]) + 
            generarTablaImpacto("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + 
            generarTablaImpacto("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) +
            `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Representante del Tribunal</p></div>
                <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. Instituto de Investigación</p></div>
            </div>`;
        }

        else if (valor === "colaboradores") {
            const listaColab = colaboradores || [];
            listaColab.sort((a, b) => (a.nombre_completo || "").localeCompare(b.nombre_completo || ""));

            let htmlTabla = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">Padrón Oficial de Colaboradores (Total: ${listaColab.length})</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 8%;">N°</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 52%;">Nombre Completo</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 40%;">Correo Electrónico</th>
                </tr></thead><tbody>`;

            if (listaColab.length === 0) {
                htmlTabla += `<tr><td colspan="3" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #666;">No hay colaboradores registrados.</td></tr>`;
            } else {
                listaColab.forEach((c, i) => {
                    htmlTabla += `<tr>
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${(c.nombre_completo || "").toUpperCase()}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; color: var(--azul-uab);">${c.correo || "N/A"}</td>
                    </tr>`;
                });
            }
            htmlTabla += `</tbody></table>`;

            areaImpresion.innerHTML = generarCabeceraOficial("COLABORADORES DE LA TECNOFERIA 2026", "Registro oficial del personal logístico y de apoyo para el evento.") + htmlTabla +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        else if (valor === "documentos") {
            const ciConProy = new Set();
            const grupos = { "1. ESTUDIANTES UNIVERSITARIOS": [], "2. DOCENTES INVESTIGADORES": [], "3. EMPRENDIMIENTOS TECNOLÓGICOS": [], "4. PENDIENTES (SIN PROYECTO REGISTRADO)": [] };

            proyectos.forEach(p => {
                if (p.estado_evaluacion === 'Evaluado (No clasifica)') return;
                
                ciConProy.add(String(p.ci_propietario).trim()); 
                
                if (p.integrantes && p.integrantes.includes('|||')) {
                    try {
                        const arrInts = JSON.parse(p.integrantes.split('|||')[1].trim());
                        arrInts.forEach(miembro => {
                            if(miembro.ci) ciConProy.add(String(miembro.ci).trim());
                        });
                    } catch(e) {}
                }

                let cat = (p.categoria || "").includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : (p.categoria || "").includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                
                let nombreLiderReal = "Desconocido";
                const expLider = expositores.find(e => e.ci === p.ci_propietario);
                if(expLider) nombreLiderReal = expLider.nombre_completo;

                grupos[cat].push({ titulo: p.titulo || "Sin Título", integrantes: extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim(), nombreLiderReal), eje: p.eje_tematico || "Sin Línea Definida", tienePDF: !!p.enlace_pdf });
            });

            expositores.forEach(exp => {
                const roles = obtenerRolesDeProyectos(exp.ci, exp.nombre_completo);
                if (roles.length === 0 && !ciConProy.has(String(exp.ci).trim())) {
                    grupos["4. PENDIENTES (SIN PROYECTO REGISTRADO)"].push({ titulo: "No registró información", integrantes: exp.nombre_completo, eje: "-", tienePDF: false });
                }
            });

            Object.values(grupos).forEach(g => g.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "")));

            const generarTablaD = (tCat, lista) => {
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tCat} (Total: ${lista.length})</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 30%;">Título del Proyecto</th><th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 35%;">Autores / Expositores</th><th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 20%;">Línea de Investigación</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Archivo PDF</th>
                    </tr></thead><tbody>`;
                if (lista.length === 0) html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay registros.</td></tr>`;
                else lista.forEach(p => html += `<tr><td style="padding: 10px; border: 1px solid #ccc; ${(p.titulo === "No registró información") ? "color: #dc3545; font-style: italic;" : "font-weight: bold;"}">${p.titulo}</td><td style="padding: 10px; border: 1px solid #ccc;">${p.integrantes}</td><td style="padding: 10px; border: 1px solid #ccc;">${p.eje}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-size: 11px;">${p.tienePDF ? `<span style="color: #28a745; font-weight: bold;">✓<br>RECIBIDO</span>` : `<span style="color: #dc3545; font-weight: bold;">❌<br>FALTANTE</span>`}</td></tr>`);
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE INSCRIPCIÓN Y CONTROL DE DOCUMENTACIÓN", `Fecha de auditoría: ${new Date().toLocaleDateString()} — Estado: Concluido`) + 
                generarTablaD("1. ESTUDIANTES UNIVERSITARIOS", grupos["1. ESTUDIANTES UNIVERSITARIOS"]) + generarTablaD("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + generarTablaD("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) + generarTablaD("4. PENDIENTES (SIN PROYECTO REGISTRADO)", grupos["4. PENDIENTES (SIN PROYECTO REGISTRADO)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 70px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Recibido y Verificado por:<br>Encargado de Soporte Técnico</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Sello de Conformidad<br>Instituto de Investigación</p></div>
                </div>`;
        }

        else if (valor === "expositores") {
            const grupos = { "1. Estudiantes Universitarios": [], "2. Docentes Investigadores": [], "3. Emprendimientos Tecnológicos": [], "4. Registrados sin Proyecto Subido (Pendientes)": [] };

            expositores.forEach(e => {
                let cat = "4. Registrados sin Proyecto Subido (Pendientes)";
                const roles = obtenerRolesDeProyectos(e.ci, e.nombre_completo);

                if (roles.length > 0) {
                    const proyPrincipal = roles.find(r => r.tipo === 'LIDER')?.proyecto || roles[0].proyecto;
                    cat = (proyPrincipal.categoria || "").includes('estudiante') ? "1. Estudiantes Universitarios" : (proyPrincipal.categoria || "").includes('docente') ? "2. Docentes Investigadores" : "3. Emprendimientos Tecnológicos";
                }

                const nombreMayuscula = (e.nombre_completo || "SIN NOMBRE").trim().toUpperCase();

                grupos[cat].push({ 
                    nombre_html: nombreMayuscula, 
                    ci: e.ci || "N/A", 
                    institucion: e.institucion || "N/A", 
                    correo: (e.correo || "").toLowerCase(), 
                    celular: e.celular || "N/A",
                    orden: nombreMayuscula
                });
            });

            Object.values(grupos).forEach(g => g.sort((a, b) => a.orden.localeCompare(b.orden)));

            const generarTablaE = (tCat, lista) => {
                if(lista.length === 0) return ""; 
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tCat} (Total: ${lista.length})</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;"><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 25%;">Nombre Completo</th><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 10%;">C.I.</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 25%;">Institución</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 20%;">Correo Electrónico</th><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th></tr></thead><tbody>`;
                lista.forEach((e, i) => html += `<tr><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${e.nombre_html}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${e.ci}</td><td style="padding: 8px; border: 1px solid #ccc;">${e.institucion}</td><td style="padding: 8px; border: 1px solid #ccc; color: #0056b3;">${e.correo}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${e.celular}</td></tr>`);
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE EXPOSITORES REGISTRADOS") +
                generarTablaE("1. Estudiantes Universitarios", grupos["1. Estudiantes Universitarios"]) + generarTablaE("2. Docentes Investigadores", grupos["2. Docentes Investigadores"]) + generarTablaE("3. Emprendimientos Tecnológicos", grupos["3. Emprendimientos Tecnológicos"]) + generarTablaE("4. Registrados sin Proyecto Subido (Pendientes)", grupos["4. Registrados sin Proyecto Subido (Pendientes)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        else if (valor === "padron_visitantes") {
            const filtroSelect = document.getElementById('institucion-select');
            const institucionElegida = filtroSelect ? filtroSelect.value : "TODOS";
            const ciQueVotaron = new Set(votos.filter(v => v.ci_visitante).map(v => String(v.ci_visitante).trim()));

            const lVis = [];
            
            visitantes.forEach(v => {
                const i = (v.institucion || "N/A").trim();
                const cel = v.celular || "Sin número"; 
                if (institucionElegida === "TODOS" || institucionElegida.toLowerCase() === i.toLowerCase()) {
                    const nombreBase = (v.nombre_completo || "SIN NOMBRE").trim().toUpperCase();
                    let n = `<strong>${nombreBase}</strong>`;
                    const roles = obtenerRolesDeProyectos(v.ci, v.nombre_completo);
                    
                    if (roles.length > 0) {
                        n += roles.map(r => {
                            if (r.tipo === 'LIDER') return `<br><span style="color: #0056b3; font-size: 0.82rem;">🔵 <b>Líder de Proyecto</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                            return `<br><span style="color: #008080; font-size: 0.82rem;">🟢 <b>Co-Expositor</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                        }).join('');
                    }
                    lVis.push({ orden: nombreBase, n, ci: String(v.ci).trim(), i, cel, v: ciQueVotaron.has(String(v.ci).trim()) ? `<span style="color:#28a745; font-weight:bold;">✓ SÍ</span>` : `<span style="color:#dc3545; font-weight:bold;">❌ NO</span>` });
                }
            });

            expositores.forEach(e => {
                const i = (e.institucion || "N/A").trim();
                const cel = e.celular || "Sin número"; 
                if (institucionElegida === "TODOS" || institucionElegida.toLowerCase() === i.toLowerCase()) {
                    const c = String(e.ci).trim();
                    const nombreBase = (e.nombre_completo || "SIN NOMBRE").trim().toUpperCase();
                    let n = `<strong>${nombreBase}</strong>`;
                    const roles = obtenerRolesDeProyectos(e.ci, e.nombre_completo);
                    
                    if (roles.length > 0) {
                        n += roles.map(r => {
                            if (r.tipo === 'LIDER') return `<br><span style="color: #0056b3; font-size: 0.82rem;">🔵 <b>Líder de Proyecto</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                            return `<br><span style="color: #008080; font-size: 0.82rem;">🟢 <b>Co-Expositor</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                        }).join('');
                    } else {
                        n += `<br><span style="color: #dc3545; font-size: 0.82rem;">🔴 <b>Expositor</b> — <i style="color: #dc3545;">No subió proyecto</i></span>`;
                    }

                    const idx = lVis.findIndex(v => v.ci === c);
                    if (idx === -1) lVis.push({ orden: nombreBase, n, ci: c, i, cel, v: ciQueVotaron.has(c) ? `<span style="color:#28a745; font-weight:bold;">✓ SÍ</span>` : `<span style="color:#dc3545; font-weight:bold;">❌ NO</span>` });
                    else { lVis[idx].orden = nombreBase; lVis[idx].n = n; lVis[idx].cel = cel; } 
                }
            });

            lVis.sort((a, b) => a.orden.localeCompare(b.orden));
            let titTab = institucionElegida === "TODOS" ? "Padrón General (Visitantes y Expositores)" : (/colegio|unidad|escuela|uab|universidad|instituto/i.test(institucionElegida)) ? `Lista de Asistencia: ${institucionElegida}` : `Visitantes Externos: ${institucionElegida}`;

            let htmlTabla = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${titTab} (Total: ${lVis.length})</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 30%;">Nombre Completo</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 12%;">C.I.</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 28%;">Institución</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 10%;">Votos</th>
                </tr></thead><tbody>`;

            if (lVis.length === 0) htmlTabla += `<tr><td colspan="6" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #666;">No hay personas registradas en esta institución.</td></tr>`;
            else lVis.forEach((v, i) => htmlTabla += `<tr>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${v.n}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${v.ci}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${v.cel}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${v.i}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 12px;">${v.v}</td>
            </tr>`);
            htmlTabla += `</tbody></table>`;

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE VISITANTES Y ESTADO DE VOTACIÓN", `Filtro aplicado: ${institucionElegida === "TODOS" ? "Padrón General (Todas las Instituciones)" : institucionElegida}`) + htmlTabla +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        else if (valor === "ejes") {
            const ejesOficiales = ["Sistemas de Información para el Desarrollo Regional", "Tecnologías Emergentes y Transformación Digital", "Ingeniería de Software y Aplicaciones Web/Móviles", "Gobierno Electrónico y Transparencia Pública", "TIC para la Gestión Ambiental y Agropecuaria"];
            const proyectosPorEje = {};
            ejesOficiales.forEach(eje => proyectosPorEje[eje] = []);
            proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"] = [];

            proyectos.forEach(p => {
                const eje = p.eje_tematico ? p.eje_tematico.trim() : "Sin Línea Definida"; 
                let tipo = (p.categoria || "").includes('docente') ? "Docentes Investigadores" : (p.categoria || "").includes('emprendimiento') ? "Emprendimientos Tecnológicos" : "Estudiantes Universitarios";
                
                let nombreLiderReal = "Desconocido";
                const expLider = expositores.find(e => e.ci === p.ci_propietario);
                if(expLider) nombreLiderReal = expLider.nombre_completo;

                const n_ints = extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim(), nombreLiderReal);

                if (ejesOficiales.includes(eje)) proyectosPorEje[eje].push({ titulo: p.titulo || "Sin Título", integrantes: n_ints, tipo: tipo });
                else proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"].push({ titulo: p.titulo || "Sin Título", integrantes: n_ints, tipo: tipo });
            });

            let htmlEjes = "";
            let contadorEje = 1;

            const armarTablaEje = (nombreEje, lista, numeroStr, colorAlerta = false) => {
                const colorFondoHead = colorAlerta ? "#fff3cd" : "#e9ecef";
                const colorBorde = colorAlerta ? "#856404" : "#001f54";
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #000; background-color: ${colorFondoHead}; padding: 8px; border-left: 5px solid ${colorBorde}; margin-top: 30px;">${numeroStr} ${nombreEje}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="border-bottom: 2px solid #000;">
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 40%;">Nombre del Proyecto</th>
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 35%;">Responsables / Integrantes</th>
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 25%;">Tipo de Expositor</th>
                            </tr>
                        </thead><tbody>`;
                
                if (lista.length === 0) { html += `<tr><td colspan="3" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666; font-style: italic;">No hay proyectos registrados en esta línea.</td></tr>`; } 
                else {
                    lista.forEach(proy => {
                        html += `<tr><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${proy.titulo}</td><td style="padding: 8px; border: 1px solid #ccc;">${proy.integrantes}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${proy.tipo}</td></tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            ejesOficiales.forEach(eje => { htmlEjes += armarTablaEje(eje, proyectosPorEje[eje], contadorEje + "."); contadorEje++; });
            if (proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"].length > 0) {
                htmlEjes += armarTablaEje("Otros (Líneas Anteriores / No Oficiales)", proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"], "⚠️", true);
            }

            areaImpresion.innerHTML = generarCabeceraOficial("RESUMEN DE PROYECTOS POR LÍNEAS DE INVESTIGACIÓN") + htmlEjes +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Revisado por:<br>Resp. de Investigación I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Aprobado por:<br>Director de Carrera UABJB</p></div>
                </div>`;
        }

        else if (valor === "tribunales") {
            const grupos = { "1. ESTUDIANTES UNIVERSITARIOS": [], "2. DOCENTES INVESTIGADORES": [], "3. EMPRENDIMIENTOS TECNOLÓGICOS": [], "OTRAS EVALUACIONES (Registros sin categoría)": [] };

            const proyectosEvaluados = {};

            evaluaciones.forEach(ev => { 
                const proy = proyectos.find(p => p.id === ev.id_proyecto);
                if (proy) {
                    let cat = (proy.categoria || "").includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : (proy.categoria || "").includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                    
                    if (!proyectosEvaluados[proy.id]) {
                        proyectosEvaluados[proy.id] = {
                            id: proy.id,
                            titulo: proy.titulo,
                            categoria: cat,
                            numGlobal: mapeoNumerosGlobales[String(proy.id)] || "N/A",
                            evaluaciones: []
                        };
                        grupos[cat].push(proyectosEvaluados[proy.id]);
                    }

                    const trib = tribunales.find(t => t.usuario_tribunal === ev.usuario_tribunal);
                    let nombreTribunalReal = trib ? trib.nombre_completo : (ev.usuario_tribunal || "Evaluador");
                    if (!nombreTribunalReal.toLowerCase().startsWith('ing')) nombreTribunalReal = "Ing. " + nombreTribunalReal;
                    
                    const notaConv = ((parseFloat(ev.nota) || 0) * 0.80).toFixed(2);
                    let obs = ev.observaciones || "Sin observaciones registradas.";
                    if (!obs.startsWith('"')) obs = '"' + obs + '"';

                    proyectosEvaluados[proy.id].evaluaciones.push({
                        nombreTribunal: nombreTribunalReal,
                        notaConv: notaConv,
                        observaciones: obs
                    });
                }
            });

            const generarTablaAgrupada = (tituloCat, listaProyectos) => {
                if (listaProyectos.length === 0 && tituloCat === "OTRAS EVALUACIONES (Registros sin categoría)") return "";
                
                listaProyectos.sort((a, b) => (a.numGlobal === "N/A" ? 999 : a.numGlobal) - (b.numGlobal === "N/A" ? 999 : b.numGlobal));

                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 5%;">Nº</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Proyecto Evaluado</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Tribunales Asignados</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Puntaje (80%)</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 35%;">Observaciones / Retroalimentación</th>
                            </tr>
                        </thead><tbody>`;
                
                if (listaProyectos.length === 0) { 
                    html += `<tr><td colspan="5" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">Aún no se han registrado calificaciones en esta categoría.</td></tr>`; 
                } 
                else {
                    listaProyectos.forEach(proy => {
                        const numEvals = proy.evaluaciones.length;
                        if(numEvals === 0) return;

                        proy.evaluaciones.forEach((ev, idx) => {
                            html += `<tr style="page-break-inside: avoid;">`;
                            if (idx === 0) {
                                html += `
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 1.1rem; color: #002b5c; background: #f9f9f9; vertical-align: middle;">#${proy.numGlobal}</td>
                                    <td rowspan="${numEvals}" style="padding: 10px; border: 1px solid #ccc; font-weight: bold; color: var(--azul-uab); vertical-align: middle;">${proy.titulo} <br><span style="font-size: 0.85rem; color: #666; font-weight: normal; margin-top:5px; display:block;"><i class="fas fa-gavel"></i> ${numEvals} evaluación(es)</span></td>
                                `;
                            }
                            html += `
                                    <td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${ev.nombreTribunal}</td>
                                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 12px;">${ev.notaConv}</td>
                                    <td style="padding: 10px; border: 1px solid #ccc; font-style: italic;">${ev.observaciones}</td>
                                </tr>`;
                        });
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("ACTA DETALLADA DE CALIFICACIONES DE TRIBUNALES", "El puntaje aquí reflejado representa únicamente la valoración técnica del Tribunal Evaluador, la cual equivale al 80% de la calificación final del proyecto.") + 
                generarTablaAgrupada("1. ESTUDIANTES UNIVERSITARIOS", grupos["1. ESTUDIANTES UNIVERSITARIOS"]) + generarTablaAgrupada("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + generarTablaAgrupada("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) + generarTablaAgrupada("OTRAS EVALUACIONES (Registros sin categoría)", grupos["OTRAS EVALUACIONES (Registros sin categoría)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Representante del Tribunal</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. Instituto de Investigación</p></div>
                </div>`;
        }
        
        else if (valor === "no_clasificados") {
            const noClasificados = proyectos.filter(p => p.estado_evaluacion === 'Evaluado (No clasifica)');
            noClasificados.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));

            let htmlTabla = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #dc3545; padding: 8px; margin-top: 25px; margin-bottom: 0;">Proyectos No Clasificados a la Etapa Final (Total: ${noClasificados.length})</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 40%;">Título del Proyecto</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 35%;">Líder y Equipo</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 20%;">Categoría</th>
                </tr></thead><tbody>`;

            if (noClasificados.length === 0) {
                htmlTabla += `<tr><td colspan="4" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #666;">No hay proyectos en esta categoría.</td></tr>`;
            } else {
                noClasificados.forEach((p, i) => {
                    let nombreLiderReal = "Desconocido";
                    const expLider = expositores.find(e => e.ci === p.ci_propietario);
                    if(expLider) nombreLiderReal = expLider.nombre_completo;
                    const ints = extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim(), nombreLiderReal);
                    let catName = (p.categoria || "").includes('estudiante') ? "Estudiante (Pregrado)" : (p.categoria || "").includes('docente') ? "Docente" : "Emprendimiento";

                    htmlTabla += `<tr>
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; color: #dc3545;">${p.titulo}</td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${ints}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${catName}</td>
                    </tr>`;
                });
            }
            htmlTabla += `</tbody></table>`;

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE PROYECTOS NO CLASIFICADOS (PRE-SELECCIÓN)", "Los proyectos listados a continuación no alcanzaron el puntaje mínimo requerido en la evaluación técnica del jurado y no pasan a la fase de exposición presencial.") + htmlTabla +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div>
                </div>`;
        }

        else if (valor === "padron_tribunales") {
            const lTrib = tribunales.map(t => ({ 
                n: (t.nombre_completo || "SIN NOMBRE").trim().toUpperCase(), 
                ci: t.ci || "S/N",
                u: t.usuario_tribunal || "N/A",
                c: t.correo || "No registrado",
                cel: t.celular || "Sin número"
            })).sort((a, b) => a.n.localeCompare(b.n));

            let htmlF = "";
            if (lTrib.length === 0) htmlF = `<tr><td colspan="6" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay tribunales registrados.</td></tr>`;
            else lTrib.forEach((t, i) => htmlF += `<tr>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${t.n}</td>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${t.ci}</td>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-family: monospace;">${t.u}</td>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${t.cel}</td>
                <td style="padding: 10px; border: 1px solid #ccc; color: var(--azul-uab);">${t.c}</td>
            </tr>`);

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE TRIBUNALES EVALUADORES") + `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                    <thead><tr style="background-color: #002b5c; color: #fff; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 32%;">Nombre del Evaluador</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 13%;">C.I.</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Usuario Asignado</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 13%;">Celular</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 22%;">Correo Electrónico</th>
                    </tr></thead>
                    <tbody>${htmlF}</tbody>
                </table>
                <div style="display: flex; justify-content: space-around; margin-top: 70px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        else if (valor === "visitantes") {
            const diccProyectos = {};
            proyectos.forEach(p => {
                let cat = (p.categoria || "").includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : (p.categoria || "").includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                diccProyectos[p.id] = { titulo: p.titulo || "Sin Título", categoria: cat, visitas: 0, sumaNotas: 0 };
            });

            const afluenciaInst = {};
            visitantes.forEach(v => {
                const instNorm = (v.institucion || "Independiente").trim().toUpperCase();
                afluenciaInst[instNorm] = (afluenciaInst[instNorm] || 0) + 1;
            });

            votos.forEach(v => {
                if (diccProyectos[v.id_proyecto]) {
                    diccProyectos[v.id_proyecto].visitas += 1;
                    diccProyectos[v.id_proyecto].sumaNotas += Math.min(parseFloat(v.nota) || 0, 100);
                }
            });

            const listaProy = [];
            Object.values(diccProyectos).forEach(p => {
                if (p.visitas > 0) listaProy.push({ titulo: p.titulo, categoria: p.categoria, visitas: p.visitas, prom: p.sumaNotas / p.visitas, pts20: (p.sumaNotas / p.visitas) * 0.20 }); 
            });

            const totalProyValidos = proyectos.filter(p => p.estado_evaluacion === 'Pre-seleccionado' || p.estado_evaluacion === 'Evaluado').length;
            const promVotosProyecto = totalProyValidos > 0 ? (votos.length / totalProyValidos).toFixed(2) : "0.00";

            const generarTablaV = (cat) => {
                const filtrados = listaProy.filter(p => p.categoria === cat).sort((a, b) => b.pts20 - a.pts20);
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 20px; margin-bottom: 0;">${cat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 40%;">Nombre del Proyecto</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 20%;">Visitas Recibidas</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 20%;">Promedio (1-100)</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; color: var(--azul-uab); width: 20%;">Puntaje (20%)</th>
                        </tr></thead><tbody>`;
                if (filtrados.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">Aún no hay votos del público en esta categoría.</td></tr>`; } 
                else {
                    filtrados.forEach(p => {
                        html += `<tr>
                            <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${p.titulo}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${p.visitas}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${p.prom.toFixed(2)}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px; color: var(--azul-uab);">${p.pts20.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            const listaInst = Object.keys(afluenciaInst).map(i => ({ nombre: i, cant: afluenciaInst[i], pct: visitantes.length > 0 ? Math.round((afluenciaInst[i] / visitantes.length) * 100) : 0 })).sort((a, b) => b.cant - a.cant);
            let htmlInst = "";
            if (listaInst.length === 0) htmlInst = `<tr><td colspan="3" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay visitantes habilitados registrados.</td></tr>`;
            else listaInst.forEach(i => htmlInst += `<tr><td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${i.nombre.toLowerCase()}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i.cant}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i.pct}%</td></tr>`);

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE VOTACIÓN Y AFLUENCIA DEL PÚBLICO") + `
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-family: Arial, sans-serif;">
                    <div style="border: 2px solid #001f54; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Total de Visitantes</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${visitantes.length}</p></div>
                    <div style="border: 2px solid #28a745; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Votos Emitidos</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${votos.length}</p></div>
                    <div style="border: 2px solid #ffc107; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Promedio de Votos/Proyecto</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${promVotosProyecto}</p></div>
                </div>
                <h3 style="font-family: Arial, sans-serif; font-size: 15px; color: #000; border-bottom: 2px solid #001f54; padding-bottom: 5px; margin-top: 30px;">A. Desglose de Votación por Proyecto (20% de la Nota Final)</h3>
                ${generarTablaV("1. ESTUDIANTES UNIVERSITARIOS") + generarTablaV("2. DOCENTES INVESTIGADORES") + generarTablaV("3. EMPRENDIMIENTOS TECNOLÓGICOS")}
                <h3 style="font-family: Arial, sans-serif; font-size: 15px; color: #000; border-bottom: 2px solid #001f54; padding-bottom: 5px; margin-top: 40px;">B. Afluencia por Instituciones Externas</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;"><th style="padding: 10px; border: 1px solid #ccc; text-align: left;">Nombre de la Institución</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center;">Cantidad de Visitantes</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center;">Porcentaje del Total</th></tr></thead>
                    <tbody>${htmlInst}</tbody>
                </table>
                <div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Interacción Social I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }

    } catch (error) {
        console.error("Error al generar reporte:", error);
        areaImpresion.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">❌ Error al conectar con la base de datos PostgreSQL.</div>';
        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }
    } 
};

window.imprimirInformeActual = function(event) {
    if (event) event.preventDefault(); 
    const areaImpresion = document.getElementById('informe-impresion');
    if (!areaImpresion || areaImpresion.style.display === 'none' || areaImpresion.innerHTML.trim() === '') {
        alert("Por favor, seleccione un tipo de informe primero para visualizarlo.");
        return;
    }

    const contenidoHTML = areaImpresion.innerHTML;
    const ventanaImpresion = window.open('', '_blank');
    
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Imprimir Informe Oficial - TecnoFeria 2026</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    color: #000; 
                    background: #fff; 
                    margin: 0; 
                    padding: 20px; 
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px; 
                    page-break-inside: auto; 
                }
                tr { 
                    page-break-inside: avoid; 
                    page-break-after: auto; 
                }
                thead { 
                    display: table-header-group; 
                }
                th, td { 
                    border: 1px solid #999; 
                    padding: 8px; 
                    font-size: 11px; 
                    text-align: left; 
                }
                th { 
                    background-color: #f2f2f2 !important; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                @page { 
                    size: A4 portrait; 
                    margin: 15mm; 
                }
            </style>
        </head>
        <body>
            ${contenidoHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function(){ window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
};
// =========================================================================
// 🔥 SISTEMA DE REGISTRO, ESCÁNER DE CÁMARA Y VERIFICACIÓN DE CERTIFICADOS 🔥
// =========================================================================

let escanerQrInstancia = null;

window.cargarLibreriaQR = function() {
    return new Promise((resolve, reject) => {
        if (window.Html5Qrcode) return resolve();
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("No se pudo cargar el lector de cámara QR."));
        document.head.appendChild(script);
    });
};

window.toggleCamaraQR = async function() {
    const cajaCamara = document.getElementById('caja-camara-qr');
    if (!cajaCamara) return;

    if (cajaCamara.style.display === 'block') {
        await window.detenerCamaraQR();
        return;
    }

    try {
        await window.cargarLibreriaQR();
        cajaCamara.style.display = 'block';

        if (!escanerQrInstancia) {
            escanerQrInstancia = new Html5Qrcode("lector-qr-video");
        }

        await escanerQrInstancia.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            async (textoDecodificado) => {
                let codigoExtraido = textoDecodificado.trim();
                try {
                    if (codigoExtraido.includes('validar_certificado=')) {
                        const urlObj = new URL(codigoExtraido);
                        codigoExtraido = urlObj.searchParams.get('validar_certificado') || codigoExtraido;
                    }
                } catch (e) {
                    const partes = codigoExtraido.split('validar_certificado=');
                    if (partes.length > 1) codigoExtraido = decodeURIComponent(partes[1].split('&')[0]);
                }

                codigoExtraido = codigoExtraido.replace(/^ID:\s*/i, '').trim().toUpperCase();

                const input = document.getElementById('input-codigo-verificacion');
                if (input) input.value = codigoExtraido;

                await window.detenerCamaraQR();
                window.ejecutarVerificacionCodigo(codigoExtraido);
            },
            () => {}
        );
    } catch (err) {
        console.error("Error al abrir la cámara:", err);
        cajaCamara.style.display = 'none';
        alert("⚠️ No se pudo acceder a la cámara. Asegúrese de otorgar permisos de cámara en el navegador.");
    }
};

window.detenerCamaraQR = async function() {
    const cajaCamara = document.getElementById('caja-camara-qr');
    try {
        if (escanerQrInstancia && escanerQrInstancia.isScanning) {
            await escanerQrInstancia.stop();
        }
    } catch (e) {}
    if (cajaCamara) cajaCamara.style.display = 'none';
};

window.abrirVerificadorCertificados = function(codigoInicial = "") {
    const modal = document.getElementById('pantalla-verificar-certificado');
    if (!modal) return;
    modal.style.display = 'block';

    if (codigoInicial) {
        const input = document.getElementById('input-codigo-verificacion');
        if (input) input.value = codigoInicial.toUpperCase();
        window.ejecutarVerificacionCodigo(codigoInicial);
    }
};

window.cerrarVerificadorCertificados = async function() {
    await window.detenerCamaraQR();
    const modal = document.getElementById('pantalla-verificar-certificado');
    if (modal) modal.style.display = 'none';
    if (window.location.search.includes('validar_certificado')) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

window.buscarCertificadoPorID = async function(e) {
    if (e) e.preventDefault();
    await window.detenerCamaraQR();
    const input = document.getElementById('input-codigo-verificacion');
    if (!input) return;
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) return;
    window.ejecutarVerificacionCodigo(codigo);
};

window.ejecutarVerificacionCodigo = async function(codigoRaw) {
    const cajaResultado = document.getElementById('resultado-verificacion-cert');
    const btn = document.getElementById('btn-verificar-id');
    if (!cajaResultado) return;

    const codigoLimpio = codigoRaw.replace(/^ID:\s*/i, '').trim().toUpperCase();
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }

    cajaResultado.innerHTML = `
        <div style="padding: 25px; text-align: center; color: #38bdf8;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px; font-weight: bold;">Consultando registro oficial en PostgreSQL...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/verificar_certificado/${encodeURIComponent(codigoLimpio)}`);
        const data = await res.json();

        if (!res.ok || !data.valido) {
            cajaResultado.innerHTML = `
                <div style="background: rgba(220, 38, 38, 0.12); border: 2px solid #ef4444; border-radius: 12px; padding: 22px; text-align: center;">
                    <i class="fas fa-times-circle" style="font-size: 3rem; color: #ef4444; margin-bottom: 10px; display: block;"></i>
                    <h4 style="color: #fca5a5; margin: 0 0 8px 0; font-size: 1.2rem; text-transform: uppercase;">Certificado No Válido / No Registrado</h4>
                    <p style="color: #e2e8f0; font-size: 0.92rem; margin: 0;">
                        El código <b style="font-family: monospace; color: #fff;">${codigoLimpio}</b> no existe en la base de datos oficial del Instituto de Investigación Interacción Social y Posgrado (I.I.S.P. - UABJB).
                    </p>
                </div>
            `;
        } else {
            const c = data.certificado;
            const fechaEmision = c.fecha_emision ? new Date(c.fecha_emision).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Octubre 2026';

            cajaResultado.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; border-radius: 12px; padding: 22px;">
                    <div style="text-align: center; border-bottom: 1px solid rgba(16, 185, 129, 0.3); padding-bottom: 14px; margin-bottom: 15px;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981; margin-bottom: 8px; display: block;"></i>
                        <span style="background: #10b981; color: #041226; padding: 4px 14px; border-radius: 50px; font-size: 0.78rem; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                            ✓ CERTIFICADO AUTÉNTICO Y VERIFICADO
                        </span>
                    </div>

                    <div style="display: grid; gap: 10px; font-size: 0.92rem; color: #e2e8f0;">
                        <div>
                            <span style="color: #94a3b8; font-size: 0.8rem; display: block;">CÓDIGO OFICIAL DE REGISTRO:</span>
                            <strong style="font-family: monospace; font-size: 1.1rem; color: #38bdf8;">${c.codigo_qr}</strong>
                        </div>
                        <div>
                            <span style="color: #94a3b8; font-size: 0.8rem; display: block;">OTORGADO OFICIALMENTE A:</span>
                            <strong style="font-size: 1.15rem; color: #ffffff;">${c.nombre_completo}</strong>
                        </div>
                        <div>
                            <span style="color: #94a3b8; font-size: 0.8rem; display: block;">DISTINCIÓN / CATEGORÍA:</span>
                            <strong style="color: #fde047;">${c.titulo_certificado || ''} — ${c.subtitulo_certificado || ''}</strong>
                        </div>
                        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border-left: 3px solid #38bdf8; line-height: 1.45; font-size: 0.88rem;">
                            ${c.detalle_certificado || ''}
                        </div>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.82rem; color: #94a3b8;">
                            <span><i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> ${c.lugar_evento || 'Campo Ferial Luis Zambrano Ibañez Fexpo Beni – Trinidad'}</span>
                            <span><i class="fas fa-calendar-check" style="color:#10b981;"></i> Emitido: ${fechaEmision}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        cajaResultado.innerHTML = `<div style="color: #ef4444; text-align: center; padding: 15px;">❌ Error de conexión al verificar el código.</div>`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Verificar'; }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const codValidar = params.get('validar_certificado');
    if (codValidar) {
        setTimeout(() => {
            window.abrirVerificadorCertificados(codValidar);
        }, 250);
    }
});

// 🔥 CONECTAR LA VENTANA DEL CERTIFICADO CON EL GUARDADO AUTOMÁTICO EN POSTGRESQL 🔥
(function() {
    const fnOriginal = window.generarCertificadoParticipacion;
    if (typeof fnOriginal !== 'function') return;

    const openOriginal = window.open;
    window.generarCertificadoParticipacion = async function(terminoBusqueda) {
        let ventanaRef = null;
        window.open = function(...args) {
            ventanaRef = openOriginal.apply(this, args);
            return ventanaRef;
        };
        try {
            await fnOriginal(terminoBusqueda);
            if (ventanaRef) {
                setTimeout(() => {
                    try {
                        const scriptSync = ventanaRef.document.createElement('script');
                        scriptSync.textContent = `
                            let bloqueandoRegenInterno = false;

                            async function sincronizarCertificadoConBD(forzarNuevo = false) {
                                try {
                                    const sel = document.querySelector('.select-plantilla-manual');
                                    const idx = sel ? Number(sel.value) : 0;
                                    const modelo = (typeof MODELOS_CERT !== 'undefined' && MODELOS_CERT[idx]) ? MODELOS_CERT[idx] : {};
                                    const codigoActual = document.getElementById('cert-qr-code-text').textContent.replace(/^ID:\\s*/i, '').trim();
                                    const nombreActual = document.querySelector('.editable-name').textContent.trim();
                                    const tituloActual = document.getElementById('cert-titulo-principal').textContent.trim();
                                    const subtituloActual = document.getElementById('cert-subtitulo').textContent.trim();
                                    const detalleActual = document.getElementById('cert-cuerpo-texto').innerHTML.trim();

                                    const res = await fetch(ORIGEN_URL + '/api/certificados_emitidos', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            codigoQr: codigoActual,
                                            identificadorUsuario: nombreActual,
                                            nombreCompleto: nombreActual,
                                            tipoCertificado: modelo.tipo || 'certificado',
                                            tituloCertificado: tituloActual,
                                            subtituloCertificado: subtituloActual,
                                            detalleCertificado: detalleActual,
                                            lugarEvento: 'Campo Ferial Luis Zambrano Ibañez Fexpo Beni – Trinidad',
                                            forzarNuevoCodigo: forzarNuevo
                                        })
                                    });
                                    const data = await res.json();
                                    if (data && data.codigo_qr) {
                                        const urlVal = ORIGEN_URL + '/?validar_certificado=' + encodeURIComponent(data.codigo_qr);
                                        document.getElementById('cert-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(urlVal);
                                        document.getElementById('cert-qr-code-text').textContent = 'ID: ' + data.codigo_qr;
                                    }
                                } catch (err) { console.error(err); }
                            }

                            const _regenOrig = window.regenerarCodigoQR;
                            window.regenerarCodigoQR = function() {
                                _regenOrig();
                                if (!bloqueandoRegenInterno) {
                                    sincronizarCertificadoConBD(true);
                                }
                            };

                            const _cambiarOrig = window.cambiarModeloCertificado;
                            window.cambiarModeloCertificado = function(indice) {
                                bloqueandoRegenInterno = true;
                                _cambiarOrig(indice);
                                bloqueandoRegenInterno = false;
                                sincronizarCertificadoConBD(false);
                            };

                            ['.editable-name', '#cert-titulo-principal', '#cert-subtitulo', '#cert-cuerpo-texto'].forEach(selector => {
                                const el = document.querySelector(selector);
                                if (el) el.addEventListener('blur', () => sincronizarCertificadoConBD(false));
                            });

                            window.addEventListener('beforeprint', () => sincronizarCertificadoConBD(false));
                            sincronizarCertificadoConBD(false);
                        `;
                        ventanaRef.document.body.appendChild(scriptSync);
                    } catch (e) { console.error(e); }
                }, 200);
            }
        } finally {
            window.open = openOriginal;
        }
    };
})();