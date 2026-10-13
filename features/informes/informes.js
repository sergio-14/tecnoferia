// =========================================================================
// ARCHIVO: features/informes/informes.js
// FUNCIÓN: Generación de reportes dinámicos, Certificados y Actas de Terna
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

function inicializarFiltroVisitantes() {
    const tipoSelect = document.getElementById('tipo-informe-select');
    if(!tipoSelect) return;

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
        cajaBusqueda.style.opacity = '0';
        setTimeout(() => cajaBusqueda.style.opacity = '1', 50);
        cajaBusqueda.style.transition = 'opacity 0.3s ease';
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
        const ci = document.getElementById('cert-ci-input').value.trim();
        if (!ci) { alert("⚠️ Por favor, ingrese el CI del participante."); return; }
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando y Generando...';
        btn.disabled = true;

        await window.generarCertificadoParticipacion(ci);
        
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
        return;
    }

    window.imprimirInformeActual(e);
};

window.generarCertificadoParticipacion = async function(ci) {
    try {
        const res = await fetch(`/api/usuarios/${ci}`);
        if (!res.ok) {
            alert("❌ Usuario no encontrado en la base de datos. Verifique el C.I.");
            return;
        }
        const data = await res.json();
        const nombre = data.datos.nombre_completo || "Nombre del Participante";
        
        const urlValidacion = `${window.location.origin}/?validar_certificado=${ci}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlValidacion)}`;

        const logoUab = `${window.location.origin}/assets/img/OIP (2).png`;
        const logoCis = `${window.location.origin}/assets/img/LogoAcreditadaa.png`;
        const logoIisp = `${window.location.origin}/assets/img/logo_iisp.png`;

        const ventanaCertificado = window.open('', '_blank');
        
        ventanaCertificado.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Certificado - ${nombre}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <style>
                    @media print {
                        @page { size: A4 landscape; margin: 0; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: white !important; }
                        .no-print { display: none !important; }
                        .certificado-container { box-shadow: none !important; transform: scale(1) !important; margin: 0 !important; width: 297mm !important; height: 210mm !important; }
                        .editable-name { border-bottom: none !important; background: transparent !important; }
                    }
                    
                    body { font-family: 'Times New Roman', serif; background: #525659; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }

                    .instruccion-flotante { position: fixed; top: 20px; left: 20px; background: rgba(0, 0, 0, 0.85); color: white; padding: 20px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 0.95rem; max-width: 320px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 1000; line-height: 1.5; }
                    .btn-imprimir { position: fixed; bottom: 30px; right: 30px; background: #28a745; color: white; padding: 15px 30px; font-size: 1.2rem; border: none; border-radius: 50px; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.4); font-family: Arial, sans-serif; font-weight: bold; z-index: 1000; transition: 0.3s; }
                    .btn-imprimir:hover { background: #218838; transform: scale(1.05); }

                    .certificado-container {
                        background: white; width: 297mm; height: 210mm; position: relative; padding: 50px; box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;
                        overflow: hidden; border: 12px solid #fff; outline: 3px solid #d4af37; outline-offset: -15px;
                        display: flex; flex-direction: column;
                    }

                    .esquina-decorativa { position: absolute; width: 300px; height: 300px; border-radius: 50%; z-index: 1; }
                    .esquina-top-izq { top: -150px; left: -150px; background: rgba(0, 43, 92, 0.1); border: 2px solid rgba(212, 175, 55, 0.3); }
                    .esquina-bottom-der { bottom: -150px; right: -150px; background: rgba(211, 47, 47, 0.05); border: 2px solid rgba(0, 43, 92, 0.2); }

                    .contenido-certificado { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; }
                    
                    .header-logos { display: flex; justify-content: center; align-items: center; gap: 40px; margin-bottom: 10px; }
                    .header-logos img { height: 85px; object-fit: contain; }

                    .qr-zone { position: absolute; top: 0; right: 0; text-align: center; }
                    .qr-zone img { width: 90px; height: 90px; border: 2px solid #eee; padding: 5px; }
                    .qr-zone span { display: block; font-size: 10px; color: #002b5c; margin-top: 5px; font-family: Arial, sans-serif; font-weight: bold; }

                    .texto-institucional { font-family: Arial, sans-serif; font-size: 1.1rem; color: #333; margin: 10px 0 15px 0; }
                    h1.titulo-cert { font-size: 3.5rem; color: #111; margin: 10px 0; font-weight: normal; letter-spacing: 2px; font-family: 'Georgia', serif; }

                    .editable-name {
                        font-size: 2.2rem; font-weight: bold; color: #000; border-bottom: 2px dashed #999; display: inline-block; min-width: 60%;
                        padding: 5px 20px; outline: none; font-style: italic; margin: 15px 0; transition: 0.3s;
                    }
                    .editable-name:focus { border-bottom-color: #4db8ff; background: #f0f8ff; }

                    .body-text { font-size: 1.3rem; color: #333; line-height: 1.6; max-width: 85%; margin: 10px auto; font-family: Arial, sans-serif; }
                    .fecha { font-family: Arial, sans-serif; font-size: 1.1rem; color: #555; margin-top: 15px; text-align: center; }

                    .firmas-container { 
                        display: flex; justify-content: space-between; align-items: flex-end; width: 100%; 
                        margin-top: auto; margin-bottom: 5px; padding: 0 20px; box-sizing: border-box; 
                    }
                    .firma-bloque { text-align: center; border-top: 1px solid #000; width: 260px; padding-top: 10px; font-family: Arial, sans-serif; position: relative; }
                    .firma-bloque h4 { margin: 0; font-size: 0.85rem; color: #000; font-weight: bold; }
                    .firma-bloque p { margin: 3px 0 0 0; font-size: 0.75rem; color: #555; }
                </style>
            </head>
            <body>
                <div class="instruccion-flotante no-print">
                    <h3 style="margin-top: 0; color: #ffc107;"><i class="fas fa-edit"></i> Edición Inteligente</h3>
                    <p>1. Si el nombre del participante está mal escrito, <b>haz clic sobre las letras en el certificado y corrígelo con el teclado</b> aquí mismo.</p>
                    <p>2. Cuando esté listo, presiona el botón verde de imprimir.</p>
                    <p style="color: #4db8ff; margin-bottom: 0;">⚠️ Configura tu impresora en modo <b>Horizontal (Landscape)</b> y "Márgenes en Ninguno" para un calce perfecto.</p>
                </div>

                <div class="certificado-container">
                    <div class="esquina-decorativa esquina-top-izq"></div>
                    <div class="esquina-decorativa esquina-bottom-der"></div>

                    <div class="contenido-certificado">
                        <div class="qr-zone">
                            <img src="${qrUrl}" alt="QR Validacion">
                            <span>ID: ${ci}</span>
                        </div>

                        <div class="header-logos">
                            <img src="${logoUab}" alt="Escudo UABJB" onerror="this.style.display='none'">
                            <img src="${logoCis}" alt="Escudo Carrera Sistemas" onerror="this.style.display='none'">
                            <img src="${logoIisp}" alt="Escudo IISP" onerror="this.style.display='none'">
                        </div>

                        <p class="texto-institucional">La Facultad de Ingeniería y Tecnología de la UABJB a través de la<br>Carrera de Ingeniería de Sistemas confiere el presente:</p>
                        <h1 class="titulo-cert">CERTIFICADO DE<br>PARTICIPACIÓN</h1>

                        <div class="editable-name" contenteditable="true" spellcheck="false" title="Haz clic para corregir el nombre">${nombre}</div>

                        <p class="body-text">
                            Por su destacada participación en el evento de exposición académica y tecnológica<br>
                            <b>TECNOFERIA 2026: "Innovación Tecnológica - Asegurando el futuro"</b>,<br>
                            desarrollado el 14 de Octubre del presente año,<br>
                            en el Campus Universitario de la UABJB.
                        </p>

                        <p class="fecha">Trinidad, Octubre de 2026.</p>

                        <div class="firmas-container">
                            <div class="firma-bloque">
                                <h4>M.SC. SAUD YUJA GÓMEZ</h4>
                                <p>DECANO F.I.T.</p>
                            </div>
                            <div class="firma-bloque">
                                <h4>M.SC. EDUARDO S. MORALES BARROSO</h4>
                                <p>DIRECTOR DE C.I.S.</p>
                            </div>
                            <div class="firma-bloque">
                                <h4>COMITÉ ORGANIZADOR</h4>
                                <p>I.I.S.P.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="btn-imprimir no-print" onclick="window.print()"><i class="fas fa-print"></i> Imprimir Certificado</button>
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
        areaImpresion.innerHTML = '<div style="text-align: center; padding: 40px; color: #0056b3; background: #e8f4fd; border-radius: 8px; border: 2px dashed #4db8ff;"><i class="fas fa-award fa-4x" style="margin-bottom:15px;"></i><h3 style="margin-top: 0; color: #002b5c;">Modo Certificado Individual Activado</h3><p style="color: #333; font-size: 1.1rem;">Ingrese el C.I. del participante en el buscador de arriba y presione el botón <b>"Procesar Documento"</b>.<br>El certificado interactivo se abrirá en una pestaña nueva listo para imprimir.</p></div>';
        if (btn) { btn.innerHTML = '<i class="fas fa-cogs"></i> Procesar Documento'; btn.disabled = false; }
        return;
    }

    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando Vista Previa...'; btn.disabled = true; }

    areaImpresion.style.display = 'block';
    areaImpresion.innerHTML = '<div style="text-align: center; padding: 40px; color: #333;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 15px; font-weight: bold;">Generando vista previa del documento...</p></div>';

    try {
        const res = await fetch('/api/datos_informes');
        const db = await res.json();
        const { proyectos, expositores, tribunales, visitantes, votos, evaluaciones } = db;

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

                const proyectosValidosGlobales = proyectos
                    .filter(p => p.estado_evaluacion !== 'Evaluado (No clasifica)')
                    .sort((a, b) => parseInt(a.id) - parseInt(b.id)); 

                let cEst = 1, cDoc = 1, cEmp = 1;
                let mapeoNumerosGlobales = {};
                proyectosValidosGlobales.forEach(p => {
                    if(p.categoria.includes('estudiante')) mapeoNumerosGlobales[p.id] = cEst++;
                    else if(p.categoria.includes('docente')) mapeoNumerosGlobales[p.id] = cDoc++;
                    else if(p.categoria.includes('emprendimiento')) mapeoNumerosGlobales[p.id] = cEmp++;
                });

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
                            
                            proyAsignados.sort((a, b) => (mapeoNumerosGlobales[a] || 999) - (mapeoNumerosGlobales[b] || 999));

                            let contoProyectosTribunal = 0;
                            proyAsignados.forEach(idProy => {
                                const proyectoDetalle = proyectosValidosGlobales.find(p => String(p.id) === String(idProy) && p.categoria.includes(cat.id));
                                if (proyectoDetalle) {
                                    contoProyectosTribunal++;
                                    let cleanIntegrantes = proyectoDetalle.integrantes.replace(/⭐ LÍDER:/g, '<b>Líder:</b>')
                                                                                    .replace(/👥 EQUIPO:/g, '<br><b>Equipo:</b>')
                                                                                    .replace(/\|\|\|.*/g, ''); 
                                    html += `
                                        <tr style="page-break-inside: avoid;">
                                            <td style="padding:8px; border:1px solid #ccc; text-align:center; font-weight:bold; font-size:1.1rem; color:#002b5c; background:#f9f9f9;">#${mapeoNumerosGlobales[String(idProy)]}</td>
                                            <td style="padding:8px; border:1px solid #ccc;">${proyectoDetalle.titulo}</td>
                                            <td style="padding:8px; border:1px solid #ccc;">${cleanIntegrantes}</td>
                                        </tr>
                                    `;
                                }
                            });

                            if (contoProyectosTribunal === 0) {
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
                    let catName = p.categoria.includes('estudiante') ? "proyectos_estudiantes" : p.categoria.includes('docente') ? "proyectos_docentes" : "proyectos_emprendimientos";
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

        else if (valor === "ejes") {
            const ejesOficiales = ["Sistemas de Información para el Desarrollo Regional", "Tecnologías Emergentes y Transformación Digital", "Ingeniería de Software y Aplicaciones Web/Móviles", "Gobierno Electrónico y Transparencia Pública", "TIC para la Gestión Ambiental y Agropecuaria"];
            const proyectosPorEje = {};
            ejesOficiales.forEach(eje => proyectosPorEje[eje] = []);
            proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"] = [];

            proyectos.forEach(p => {
                const eje = p.eje_tematico ? p.eje_tematico.trim() : "Sin Línea Definida"; 
                let tipo = p.categoria.includes('docente') ? "Docentes Investigadores" : p.categoria.includes('emprendimiento') ? "Emprendimientos Tecnológicos" : "Estudiantes Universitarios";
                
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

            evaluaciones.forEach(ev => { 
                const proy = proyectos.find(p => p.id === ev.id_proyecto);
                const trib = tribunales.find(t => t.usuario_tribunal === ev.usuario_tribunal);
                const nombreTribunalReal = trib ? trib.nombre_completo : (ev.usuario_tribunal || "Evaluador");
                let cat = "OTRAS EVALUACIONES (Registros sin categoría)";
                
                if (proy) {
                    cat = proy.categoria.includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : proy.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                }
                grupos[cat].push({ tituloProyecto: proy ? proy.titulo : "Proyecto Desconocido", nombreTribunal: nombreTribunalReal, notaTribunal: ev.nota, observaciones: ev.observaciones });
            });

            const generarTabla = (tituloCat, lista) => {
                if (lista.length === 0 && tituloCat === "OTRAS EVALUACIONES (Registros sin categoría)") return "";
                lista.sort((a, b) => (parseFloat(b.notaTribunal) || 0) - (parseFloat(a.notaTribunal) || 0));
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 20%;">Proyecto Evaluado</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Tribunal Asignado</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Puntaje (80%)</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 45%;">Observaciones / Retroalimentación</th>
                            </tr>
                        </thead><tbody>`;
                if (lista.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">Aún no se han registrado calificaciones.</td></tr>`; } 
                else {
                    lista.forEach(ev => {
                        let tribunal = ev.nombreTribunal || "Ing. Evaluador";
                        if (!tribunal.toLowerCase().startsWith('ing')) tribunal = "Ing. " + tribunal;
                        const notaConv = ((parseFloat(ev.notaTribunal) || 0) * 0.80).toFixed(2);
                        let obs = ev.observaciones || "Sin observaciones registradas.";
                        if (!obs.startsWith('"')) obs = '"' + obs + '"';

                        html += `<tr>
                                <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold; color: var(--azul-uab);">${ev.tituloProyecto}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${tribunal}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px;">${notaConv}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; font-style: italic;">${obs}</td>
                            </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("ACTA DETALLADA DE CALIFICACIONES DE TRIBUNALES", "El puntaje aquí reflejado representa únicamente la valoración técnica del Tribunal Evaluador, la cual equivale al 80% de la calificación final del proyecto.") + 
                generarTabla("1. ESTUDIANTES UNIVERSITARIOS", grupos["1. ESTUDIANTES UNIVERSITARIOS"]) + generarTabla("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + generarTabla("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) + generarTabla("OTRAS EVALUACIONES (Registros sin categoría)", grupos["OTRAS EVALUACIONES (Registros sin categoría)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Representante del Tribunal</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. Instituto de Investigación</p></div>
                </div>`;
        }
        
        else if (valor === "visitantes") {
            const diccProyectos = {};
            proyectos.forEach(p => {
                let cat = p.categoria.includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : p.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
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

                let cat = p.categoria.includes('estudiante') ? "1. ESTUDIANTES UNIVERSITARIOS" : p.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                
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

            Object.values(grupos).forEach(g => g.sort((a, b) => a.titulo.localeCompare(b.titulo)));

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
                    cat = proyPrincipal.categoria.includes('estudiante') ? "1. Estudiantes Universitarios" : proyPrincipal.categoria.includes('docente') ? "2. Docentes Investigadores" : "3. Emprendimientos Tecnológicos";
                }

                const nombreCapitalizado = (e.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

                grupos[cat].push({ 
                    nombre_html: nombreCapitalizado, 
                    ci: e.ci || "N/A", 
                    institucion: e.institucion || "N/A", 
                    correo: (e.correo || "").toLowerCase(), 
                    celular: e.celular || "N/A",
                    orden: e.nombre_completo 
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

        else if (valor === "padron_tribunales") {
            const lTrib = tribunales.map(t => ({ 
                n: (t.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
                e: t.especialidad || "No especificada", 
                c: t.correo || "No registrado",
                cel: t.celular || "Sin número"
            })).sort((a, b) => a.n.localeCompare(b.n));

            let htmlF = "";
            if (lTrib.length === 0) htmlF = `<tr><td colspan="5" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay tribunales registrados.</td></tr>`;
            else lTrib.forEach((t, i) => htmlF += `<tr>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${t.n}</td>
                <td style="padding: 10px; border: 1px solid #ccc;">${t.e}</td>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${t.cel}</td>
                <td style="padding: 10px; border: 1px solid #ccc; color: var(--azul-uab);">${t.c}</td>
            </tr>`);

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE TRIBUNALES EVALUADORES") + `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                    <thead><tr style="background-color: #002b5c; color: #fff; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 30%;">Nombre del Tribunal</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Especialidad</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Correo Electrónico</th>
                    </tr></thead>
                    <tbody>${htmlF}</tbody>
                </table>
                <div style="display: flex; justify-content: space-around; margin-top: 70px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }

    } catch (error) {
        console.error("Error al generar reporte:", error);
        areaImpresion.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">❌ Error al conectar con la base de datos PostgreSQL.</div>';
        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }
    } 
};

// 🔥 FUNCIÓN DE IMPRESIÓN LIMPIA Y PROFESIONAL 🔥
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
                /* 🔥 Forzamos al navegador a respetar las hojas en PDF 🔥 */
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