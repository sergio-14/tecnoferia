// =========================================================================
// ARCHIVO: core/utils.js
// FUNCIÓN: Herramientas globales, auto-completado, sumatorias y PDF
// =========================================================================

let currentRole = "";

function validarPuntaje(input, maximo) {
    if (input.value.includes('-')) { input.value = input.value.replace('-', ''); }
    if (parseFloat(input.value) > maximo) { input.value = maximo; }
}

function imprimirElemento(id) {
    document.body.classList.add('printing');
    const elemento = document.getElementById(id);
    if(elemento) elemento.classList.add('print-target');
    window.print();
    document.body.classList.remove('printing');
    if(elemento) elemento.classList.remove('print-target');
}

window.toggleMenu = function() {
    const navLinks = document.getElementById('nav-links-menu');
    if (navLinks && window.innerWidth <= 1024) { navLinks.classList.toggle('active'); }
}

let prevScrollpos = window.pageYOffset;
window.onscroll = function() {
    let currentScrollPos = window.pageYOffset;
    let header = document.getElementById("main-header");
    let navLinks = document.getElementById('nav-links-menu');
    
    if (navLinks && navLinks.classList.contains('active')) return;
    if (header) {
        if (prevScrollpos > currentScrollPos) { header.style.top = "0"; } 
        else { if (currentScrollPos > 50) { header.style.top = "-100px"; } }
    }
    prevScrollpos = currentScrollPos;
}

document.addEventListener("DOMContentLoaded", () => {
    const observadorScroll = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) { entrada.target.classList.add('is-visible'); } 
            else { entrada.target.classList.remove('is-visible'); }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.info-card-item, .form-card, .eval-card, .dashboard-oscuro, .modern-form-wrapper').forEach(elemento => {
        elemento.classList.add('fade-scroll');
        observadorScroll.observe(elemento);
    });
});

document.addEventListener("input", async function(e) {
    const id = e.target.id;
    if (id === 'preCI' || id === 'hab-ci' || id === 'admin-hab-ci') {
        const ciIngresado = e.target.value.trim();
        
        let inputNombre, selectInst, inputCelular;
        if (id === 'preCI') { inputNombre = document.getElementById('preNombre'); selectInst = document.getElementById('preInst'); inputCelular = document.getElementById('preCelular'); }
        if (id === 'hab-ci') { inputNombre = document.getElementById('hab-nombre'); selectInst = document.getElementById('hab-institucion'); inputCelular = document.getElementById('hab-celular'); }
        if (id === 'admin-hab-ci') { inputNombre = document.getElementById('admin-hab-nombre'); selectInst = document.getElementById('admin-hab-institucion'); inputCelular = document.getElementById('admin-hab-celular'); }

        if (ciIngresado.length < 5) {
            if (inputNombre) { 
                inputNombre.readOnly = false; 
                inputNombre.style.backgroundColor = ""; 
                inputNombre.style.opacity = "1";
                if(inputNombre.dataset.autofilled === "true") { inputNombre.value = ""; inputNombre.dataset.autofilled = "false"; }
            }
            if (inputCelular) { 
                inputCelular.readOnly = false; 
                inputCelular.style.backgroundColor = ""; 
                inputCelular.style.opacity = "1";
                if(inputCelular.dataset.autofilled === "true") { inputCelular.value = ""; inputCelular.dataset.autofilled = "false"; }
            }
            if (selectInst) { 
                selectInst.style.pointerEvents = "auto"; 
                selectInst.style.backgroundColor = ""; 
                selectInst.style.opacity = "1";
                if(selectInst.dataset.autofilled === "true") { selectInst.value = ""; selectInst.dataset.autofilled = "false"; }
            }
            return;
        }

        try {
            const res = await fetch(`/api/usuarios/${ciIngresado}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.datos) {
                    if (inputNombre) {
                        inputNombre.value = data.datos.nombre_completo;
                        inputNombre.readOnly = true; 
                        inputNombre.style.backgroundColor = "rgba(0,0,0,0.3)";
                        inputNombre.style.opacity = "0.7";
                        inputNombre.dataset.autofilled = "true";
                    }
                    if (inputCelular && data.datos.celular) {
                        inputCelular.value = data.datos.celular;
                        inputCelular.readOnly = true; 
                        inputCelular.style.backgroundColor = "rgba(0,0,0,0.3)";
                        inputCelular.style.opacity = "0.7";
                        inputCelular.dataset.autofilled = "true";
                    }
                    if (selectInst && data.datos.institucion) {
                        let existe = Array.from(selectInst.options).some(opt => opt.value === data.datos.institucion);
                        if (!existe) selectInst.add(new Option(data.datos.institucion, data.datos.institucion));
                        
                        selectInst.value = data.datos.institucion;
                        selectInst.style.pointerEvents = "none"; 
                        selectInst.style.backgroundColor = "rgba(0,0,0,0.3)";
                        selectInst.style.opacity = "0.7";
                        selectInst.dataset.autofilled = "true";
                    }
                }
            }
        } catch(err) {}
    }
});

// 🔥 BLINDAJE INQUEBRANTABLE TRIBUNAL 🔥
window.sumarTribunal = function(elemento) {
    if (elemento) {
        let val = elemento.value.replace(/[^0-9]/g, '');
        val = val.replace(/^0+/, '');
        if (val !== "") {
            val = parseInt(val, 10);
            let max = parseInt(elemento.getAttribute('max'), 10);
            if (val > max) val = max;
        }
        elemento.value = val;
    }
    const inputs = document.querySelectorAll('.trib-nota');
    let total = 0;
    inputs.forEach(input => { if (input.value !== "") total += parseInt(input.value, 10); });
    const evalNota = document.getElementById('eval-nota');
    if(evalNota) evalNota.value = total;
};

// 🔥 BLINDAJE INQUEBRANTABLE PÚBLICO 🔥
window.sumarPublico = function(elemento) {
    if (elemento) {
        let val = elemento.value.replace(/[^0-9]/g, '');
        val = val.replace(/^0+/, '');
        if (val !== "") {
            val = parseInt(val, 10);
            let max = parseInt(elemento.getAttribute('max'), 10);
            if (val > max) val = max;
        }
        elemento.value = val;
    }
    const inputs = document.querySelectorAll('.pub-nota');
    let total = 0;
    let completados = 0;
    inputs.forEach(input => {
        if (input.value !== "") {
            total += parseInt(input.value, 10);
            completados++;
        }
    });
    const votoPuntaje = document.getElementById('voto-puntaje');
    if(votoPuntaje) votoPuntaje.value = total;
    const btn = document.getElementById('btnEnviarVoto');
    const ciInput = document.getElementById('voto-ci');
    if (btn && ciInput) {
        const ciVal = ciInput.value.trim();
        if (completados === 4 && ciVal.length >= 5) {
            window.calificacionActual = total; 
            window.simularVerificacionCI();
        } else {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        }
    }
};

window.abrirVisorPDF = function(url) {
    if (!url || url === "undefined" || url === "null" || url === "") {
        alert('⚠️ Este proyecto no tiene un documento PDF subido.'); return;
    }
    let urlSegura = url.startsWith('/archivos_proyectos/') ? url.replace('/archivos_proyectos/', '/ver-pdf/') : url;
    let urlAbsoluta = window.location.origin + urlSegura + "?t=" + new Date().getTime();

    const modalViejo = document.getElementById('modal-visor-pdf-global');
    if (modalViejo) document.body.removeChild(modalViejo);

    const modal = document.createElement('div');
    modal.id = 'modal-visor-pdf-global';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,25,50,0.95); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px);';
    
    const header = document.createElement('div');
    header.style.cssText = 'width: 90%; max-width: 1000px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    header.innerHTML = '<h3 style="color: white; margin: 0; font-family: sans-serif;"><i class="fas fa-file-pdf" style="color: #e74c3c;"></i> Visor Oficial Seguro</h3>';
    
    const btnCerrar = document.createElement('button');
    btnCerrar.innerHTML = '<i class="fas fa-times"></i> Cerrar Visor';
    btnCerrar.style.cssText = 'background: #d32f2f; color: white; border: none; padding: 10px 20px; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;';
    btnCerrar.onclick = () => document.body.removeChild(modal);
    header.appendChild(btnCerrar);
    modal.appendChild(header);

    const container = document.createElement('div');
    container.style.cssText = 'width: 90%; max-width: 1000px; height: 82vh; background: #525659; border-radius: 8px; overflow-y: auto; text-align: center; padding: 15px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.8);';
    
    const loadingText = document.createElement('p');
    loadingText.style.cssText = 'color: white; font-size: 1.1rem; margin-top: 50px;';
    loadingText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando documento de forma segura...';
    container.appendChild(loadingText);
    modal.appendChild(container);
    document.body.appendChild(modal);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        fetch(urlAbsoluta, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(res => res.blob())
            .then(blob => {
                const fileReader = new FileReader();
                fileReader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                    window.pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                        loadingText.style.display = "none";
                        const esPC = window.innerWidth > 768;
                        const zoomScale = esPC ? 1.5 : 1.2;

                        for(let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            pdf.getPage(pageNum).then(page => {
                                const canvas = document.createElement('canvas');
                                canvas.style.cssText = 'max-width: 95%; margin-bottom: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.5); border-radius: 4px;';
                                const ctx = canvas.getContext('2d');
                                const viewport = page.getViewport({scale: zoomScale});
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                                page.render({canvasContext: ctx, viewport: viewport});
                                container.appendChild(canvas);
                            });
                        }
                    });
                };
                fileReader.readAsArrayBuffer(blob);
            })
            .catch(err => { loadingText.innerHTML = '❌ Error al cargar el documento.'; });
    };
    document.head.appendChild(script);
};

// 🔥 NUEVO: VISOR ESPECIAL PARA ENLACES EXTERNOS COMO GOOGLE DOCS 🔥
window.abrirVisorDocs = function(url) {
    if (!url) return;
    
    // Forzamos el modo "vista previa" de Google Docs para ocultar los menús
    let urlLimpia = url.includes('/edit') ? url.replace('/edit', '/preview') : url;

    const modalViejo = document.getElementById('modal-visor-docs-global');
    if (modalViejo) document.body.removeChild(modalViejo);

    const modal = document.createElement('div');
    modal.id = 'modal-visor-docs-global';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,25,50,0.95); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px);';
    
    const header = document.createElement('div');
    header.style.cssText = 'width: 90%; max-width: 1000px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    header.innerHTML = '<h3 style="color: white; margin: 0; font-family: sans-serif;"><i class="fas fa-file-alt" style="color: #4db8ff;"></i> Convocatoria Oficial</h3>';
    
    const btnCerrar = document.createElement('button');
    btnCerrar.innerHTML = '<i class="fas fa-times"></i> Cerrar Visor';
    btnCerrar.style.cssText = 'background: #d32f2f; color: white; border: none; padding: 10px 20px; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;';
    btnCerrar.onclick = () => document.body.removeChild(modal);
    header.appendChild(btnCerrar);
    modal.appendChild(header);

    const container = document.createElement('div');
    container.style.cssText = 'width: 90%; max-width: 1000px; height: 82vh; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; position: relative;';
    
    // Indicador de carga visual detrás del iframe
    const loader = document.createElement('div');
    loader.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x" style="color: #002b5c;"></i><p style="margin-top: 10px; font-weight: bold; color: #555;">Cargando documento...</p>';
    loader.style.cssText = 'position: absolute; text-align: center; z-index: 1;';
    container.appendChild(loader);

    const iframe = document.createElement('iframe');
    iframe.src = urlLimpia;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; position: relative; z-index: 2; background: transparent;';
    
    container.appendChild(iframe);
    modal.appendChild(container);
    document.body.appendChild(modal);
};

window.activarModoPublico = function() {
    if (localStorage.getItem("feria_rol")) return;
    const url = window.location.href;
    const esModoPublico = url.includes('idProy=') || url.includes('#/votar') || url.includes('action=registro_visitante') || url.includes('action=registro_expositor');

    if (esModoPublico) {
        document.querySelectorAll('.navbar, header, #main-header').forEach(barra => { barra.style.setProperty('display', 'none', 'important'); });
        const contenido = document.getElementById('main-content') || document.body;
        if (contenido) contenido.style.setProperty('padding-top', '0px', 'important');
    }
};

document.addEventListener("DOMContentLoaded", window.activarModoPublico);
window.addEventListener("hashchange", window.activarModoPublico);
setTimeout(window.activarModoPublico, 300);