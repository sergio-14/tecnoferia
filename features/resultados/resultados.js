// =========================================================================
// ARCHIVO: features/resultados/resultados.js
// FUNCIÓN: Generación del Ranking Oficial en Tiempo Real y Ganadores
// =========================================================================

let chartEstudiante = null;
let chartDocente = null;
let chartEmprendimiento = null;

window.calcularResultadosEnTiempoReal = async function() {
    try {
        const resConf = await fetch('/api/configuraciones');
        const conf = await resConf.json();
        
        let fechaResultados = new Date(NaN);
        const resStr = conf.fecha_resultados;
        if (resStr) {
            const [dPart, tPart] = resStr.split('T');
            const [yy, mm, dd] = dPart.split('-');
            const [hh, mns, ss] = tPart.split(':');
            fechaResultados = new Date(yy, mm - 1, dd, hh, mns, ss);
        }

        const ahora = new Date();
        const rolActual = localStorage.getItem("feria_rol") || "";

        const idsA_Ocultar = ['bloque-res-est', 'bloque-res-doc', 'bloque-res-emp', 'btn-mas-detalle', 'tabla-detalles'];

        let cartelBloqueo = document.getElementById('panel-candado-resultados');
        if (!cartelBloqueo) {
            cartelBloqueo = document.createElement('div');
            cartelBloqueo.id = 'panel-candado-resultados';
            const headerModulo = document.querySelector('#resultados .header-module');
            if (headerModulo) headerModulo.insertAdjacentElement('afterend', cartelBloqueo);
        }

        let alertaAdmin = document.getElementById('alerta-admin-resultados');
        if (!alertaAdmin) {
            alertaAdmin = document.createElement('div');
            alertaAdmin.id = 'alerta-admin-resultados';
            alertaAdmin.style.cssText = 'background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.5); color: #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold;';
            cartelBloqueo.insertAdjacentElement('afterend', alertaAdmin);
        }

        let panelGanadores = document.getElementById('contenedor-ganadores-extra');
        if (!panelGanadores) {
            panelGanadores = document.createElement('div');
            panelGanadores.id = 'contenedor-ganadores-extra';
            const btnDet = document.getElementById('btn-mas-detalle');
            if(btnDet) btnDet.insertAdjacentElement('beforebegin', panelGanadores);
        }

        if (!isNaN(fechaResultados.getTime()) && ahora < fechaResultados && rolActual !== "ADMIN") {
            
            idsA_Ocultar.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
            alertaAdmin.style.display = 'none';
            panelGanadores.style.display = 'none';
            
            if(chartEstudiante) { chartEstudiante.destroy(); chartEstudiante = null; }
            if(chartDocente) { chartDocente.destroy(); chartDocente = null; }
            if(chartEmprendimiento) { chartEmprendimiento.destroy(); chartEmprendimiento = null; }

            const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            cartelBloqueo.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 15px; border: 2px dashed rgba(255,255,255,0.2); margin-top: 30px; backdrop-filter: blur(10px);">
                    <i class="fas fa-lock" style="font-size: 5rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                    <h2 style="color: #ffffff; margin-bottom: 15px;">Ranking Protegido</h2>
                    <p style="color: #cbd5e1; font-size: 1.1rem; max-width: 500px; margin: 0 auto;">Los proyectos se encuentran en etapa de evaluación. Los resultados oficiales se revelarán automáticamente el:<br>
                    <strong style="color: #4db8ff; font-size: 1.3rem; display: block; margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px;">${fechaResultados.toLocaleDateString('es-ES', opcionesFecha)}</strong></p>
                </div>`;
            cartelBloqueo.style.display = 'block';
            
            const msgVacio = document.getElementById('mensaje-sin-ranking');
            if (msgVacio) msgVacio.style.display = 'none';

        } else {
            cartelBloqueo.style.display = 'none';

            if (rolActual === "ADMIN" && ahora < fechaResultados) {
                alertaAdmin.innerHTML = '<i class="fas fa-eye"></i> <b>Modo Administrador:</b> Estás monitoreando el ranking. El público general tiene esta pantalla bloqueada.';
                alertaAdmin.style.display = 'block';
            } else {
                alertaAdmin.style.display = 'none';
            }

            window.renderizarTablasRanking();
        }
    } catch (error) { console.error("Error en resultados:", error); }
};

window.renderizarTablasRanking = async function() {
    try {
        const ciFeria = localStorage.getItem("feria_ci") || "publico";
        const respuesta = await fetch(`/api/resultados?ci=${ciFeria}`);
        const dataRes = await respuesta.json();

        if (dataRes.error) {
            console.warn(dataRes.error);
            return;
        }

        const data = dataRes.resultados || [];
        const mostrarPremiosExtra = dataRes.mostrarPremios === true;

        const rolActual = localStorage.getItem("feria_rol") || "";
        let verEst = true, verDoc = true, verEmp = true;
        let mostrarAvisoVacio = false;

        if (rolActual === "EXPOSITOR") {
            verEst = false; verDoc = false; verEmp = false;
            mostrarAvisoVacio = true; 
            try {
                const resMiProy = await fetch(`/api/proyectos/${ciFeria}`);
                if (resMiProy.ok) {
                    const miProy = await resMiProy.json();
                    if (miProy && miProy.categoria) {
                        mostrarAvisoVacio = false; 
                        const cat = miProy.categoria.toLowerCase();
                        if (cat.includes('estudiante')) verEst = true;
                        else if (cat.includes('docente')) verDoc = true;
                        else if (cat.includes('emprendimiento')) verEmp = true;
                    }
                }
            } catch(e){}
        } 
        else if (rolActual === "TRIBUNAL") {
            verEst = false; verDoc = false; verEmp = false;
            const correoTribunal = localStorage.getItem("feria_correo");
            try {
                const resTrib = await fetch(`/api/tribunal_correo/${correoTribunal}`);
                if (resTrib.ok) {
                    const trib = await resTrib.json();
                    if (trib && trib.categoria_asignada) {
                        const cat = trib.categoria_asignada.toLowerCase();
                        if (cat.includes('estudiante')) verEst = true;
                        if (cat.includes('docente')) verDoc = true;
                        if (cat.includes('emprendimiento')) verEmp = true;
                    }
                }
            } catch(e){}
        }

        const aplicarVisibilidad = (id, mostrar) => {
            const el = document.getElementById(id);
            if (el) el.style.display = mostrar ? 'block' : 'none';
        };

        aplicarVisibilidad('bloque-res-est', verEst); aplicarVisibilidad('bloque-det-est', verEst);
        aplicarVisibilidad('bloque-res-doc', verDoc); aplicarVisibilidad('bloque-det-doc', verDoc);
        aplicarVisibilidad('bloque-res-emp', verEmp); aplicarVisibilidad('bloque-det-emp', verEmp);

        const btnDetalle = document.getElementById('btn-mas-detalle');
        if (btnDetalle) {
            btnDetalle.style.display = (verEst || verDoc || verEmp) ? 'flex' : 'none';
        }

        let msgVacio = document.getElementById('mensaje-sin-ranking');
        if (!msgVacio) {
            msgVacio = document.createElement('div');
            msgVacio.id = 'mensaje-sin-ranking';
            msgVacio.style.cssText = 'text-align: center; padding: 50px 20px; background: rgba(0, 0, 0, 0.15); border-radius: 12px; margin-top: 20px; color: #a0aec0; border: 2px dashed rgba(255,255,255,0.1);';
            const headerModulo = document.querySelector('#resultados .header-module');
            if (headerModulo) headerModulo.insertAdjacentElement('afterend', msgVacio);
        }

        if (mostrarAvisoVacio) {
            msgVacio.style.display = 'block';
            msgVacio.innerHTML = `
                <i class="fas fa-project-diagram" style="font-size: 3.5rem; color: rgba(255,255,255,0.2); margin-bottom: 15px;"></i>
                <h3 style="color: #ffffff; font-size: 1.3rem; margin-bottom: 10px;">Aún no has registrado tu proyecto</h3>
                <p style="font-size: 0.95rem; max-width: 400px; margin: 0 auto; line-height: 1.5;">Ve a la pestaña <b>"Mi Proyecto"</b>, sube tu documentación y el sistema te asignará a tu ranking correspondiente automáticamente.</p>
            `;
        } else {
            msgVacio.style.display = 'none';
        }

        ['top-estudiantes', 'top-docentes', 'top-emprendimientos', 'ranking-estudiantes', 'ranking-docentes', 'ranking-emprendimientos'].forEach(id => {
            const tb = document.getElementById(id); if (tb) tb.innerHTML = '';
        });

        const inyectarFilas = (arreglo, idTop, idRanking) => {
            const tbTop = document.getElementById(idTop); const tbRank = document.getElementById(idRanking);
            if (!tbTop || !tbRank) return;

            if (arreglo.length === 0) {
                tbTop.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:15px; color:#fff;">Sin proyectos evaluados</td></tr>';
                tbRank.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">Sin datos</td></tr>';
                return;
            }

            arreglo.forEach((proy, index) => {
                const medallaHTML = index === 0 ? '<i class="fas fa-trophy" style="color: #FFD700; font-size: 1.5rem;"></i>' : index === 1 ? '<i class="fas fa-trophy" style="color: #C0C0C0; font-size: 1.5rem;"></i>' : index === 2 ? '<i class="fas fa-trophy" style="color: #CD7F32; font-size: 1.5rem;"></i>' : `<b>${index + 1}º</b>`;
                if (index < 3) tbTop.innerHTML += `<tr><td><div style="display:flex; align-items:center; gap:10px;">${medallaHTML} <span>${proy.titulo}</span></div></td><td style="text-align:center; font-weight:bold; font-size:1.1rem; color:#4db8ff;">${proy.nota_final.toFixed(2)}</td></tr>`;
                tbRank.innerHTML += `<tr><td style="text-align:center;">${medallaHTML}</td><td>${proy.titulo}</td><td style="text-align:center;">${proy.tribunal_80.toFixed(2)}</td><td style="text-align:center;">${proy.publico_20.toFixed(2)}</td><td style="text-align:center; font-weight:bold; color:var(--rojo-uab); font-size:1.1rem;">${proy.nota_final.toFixed(2)}</td></tr>`;
            });
        };

        const dataEst = data.filter(p => p.categoria.includes('estudiante'));
        const dataDoc = data.filter(p => p.categoria.includes('docente'));
        const dataEmp = data.filter(p => p.categoria.includes('emprendimiento'));

        inyectarFilas(dataEst, 'top-estudiantes', 'ranking-estudiantes');
        inyectarFilas(dataDoc, 'top-docentes', 'ranking-docentes');
        inyectarFilas(dataEmp, 'top-emprendimientos', 'ranking-emprendimientos');

        // 🔥 DIBUJAR LOS PREMIOS EXTRA 🔥
        const panelGanadores = document.getElementById('contenedor-ganadores-extra');
        if (panelGanadores) {
            if (mostrarPremiosExtra && (dataEst.length > 0 || dataDoc.length > 0 || dataEmp.length > 0)) {
                
                const premioImpacto = [...data].sort((a, b) => b.nota_impacto - a.nota_impacto)[0];
                const premioPublico = [...data].sort((a, b) => b.promedio_publico_bruto - a.promedio_publico_bruto)[0];

                let htmlExtra = '';
                
                if (premioImpacto && premioImpacto.nota_impacto > 0) {
                    htmlExtra += `
                    <div style="background: rgba(30, 41, 59, 0.7); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                        <h3 style="color: #2ecc71; margin-top: 0; font-size: 1.4rem; margin-bottom: 10px;"><i class="fas fa-leaf"></i> PREMIO AL IMPACTO SOCIAL</h3>
                        <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 20px;">Otorgado al proyecto con la mejor calificación del jurado en el rubro de pertinencia e impacto para el departamento del Beni.</p>
                        
                        <div style="max-width: 600px; margin: 0 auto; background: #2a2a2a; border-radius: 8px; overflow: hidden; border: 1px solid #444;">
                            <div style="background-color: #28a745; color: white; padding: 12px; font-weight: bold; font-size: 1.1rem; text-transform: uppercase;">
                                GANADOR - IMPACTO SOCIAL
                            </div>
                            <table style="width: 100%; border-collapse: collapse; text-align: center; color: white;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #555;">
                                        <th style="padding: 15px; width: 70%; text-align: left; padding-left: 20px;">Proyecto</th>
                                        <th style="padding: 15px; width: 30%;">Nota Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 20px; text-align: left; border-right: 1px solid #444;">
                                            <i class="fas fa-trophy" style="color: #ffc107; margin-right: 8px;"></i> <b>${premioImpacto.titulo}</b>
                                        </td>
                                        <td style="padding: 20px; font-size: 1.2rem; font-weight: bold; color: #4db8ff;">
                                            ${premioImpacto.nota_impacto.toFixed(2)} / 15 pts
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }

                if (premioPublico && premioPublico.promedio_publico_bruto > 0) {
                    htmlExtra += `
                    <div style="background: rgba(30, 41, 59, 0.7); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
                        <h3 style="color: #ff6b6b; margin-top: 0; font-size: 1.4rem; margin-bottom: 10px;"><i class="fas fa-heart"></i> PREMIO DEL PÚBLICO</h3>
                        <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 20px;">Otorgado al proyecto más querido y votado por la audiencia y visitantes de la feria.</p>
                        
                        <div style="max-width: 600px; margin: 0 auto; background: #2a2a2a; border-radius: 8px; overflow: hidden; border: 1px solid #444;">
                            <div style="background-color: #dc3545; color: white; padding: 12px; font-weight: bold; font-size: 1.1rem; text-transform: uppercase;">
                                GANADOR - VOTACIÓN DEL PÚBLICO
                            </div>
                            <table style="width: 100%; border-collapse: collapse; text-align: center; color: white;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #555;">
                                        <th style="padding: 15px; width: 70%; text-align: left; padding-left: 20px;">Proyecto</th>
                                        <th style="padding: 15px; width: 30%;">Votos Promedio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 20px; text-align: left; border-right: 1px solid #444;">
                                            <i class="fas fa-trophy" style="color: #ffc107; margin-right: 8px;"></i> <b>${premioPublico.titulo}</b>
                                        </td>
                                        <td style="padding: 20px; font-size: 1.2rem; font-weight: bold; color: #4db8ff;">
                                            ${premioPublico.promedio_publico_bruto.toFixed(2)} / 100 pts
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }

                panelGanadores.innerHTML = htmlExtra;
                panelGanadores.style.display = 'block';
            } else {
                panelGanadores.style.display = 'none';
            }
        }

        const crearGraficoPastel = (canvasId, arregloDatos, chartVariable) => {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return chartVariable;
            
            if (chartVariable !== null) chartVariable.destroy();

            if (arregloDatos.length === 0) {
                ctx.style.display = 'none';
                return null;
            }
            
            ctx.style.display = 'block';

            const top5 = arregloDatos.slice(0, 5);
            const etiquetas = top5.map(p => p.titulo.length > 20 ? p.titulo.substring(0, 20) + "..." : p.titulo);
            const puntajes = top5.map(p => p.nota_final.toFixed(2));
            const colores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: etiquetas,
                    datasets: [{
                        data: puntajes,
                        backgroundColor: colores.slice(0, top5.length),
                        borderWidth: 2,
                        borderColor: '#2b2b2b'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#ffffff', font: { size: 12 } }
                        }
                    }
                }
            });
        };

        if (verEst) chartEstudiante = crearGraficoPastel('graficoPastel', dataEst, chartEstudiante);
        if (verDoc) chartDocente = crearGraficoPastel('graficoPastelDocentes', dataDoc, chartDocente);
        if (verEmp) chartEmprendimiento = crearGraficoPastel('graficoPastelEmprendimientos', dataEmp, chartEmprendimiento);

    } catch (error) { console.error(error); }
};

window.alternarDetalles = function() {
    const tabla = document.getElementById('tabla-detalles');
    const btn = document.getElementById('btn-mas-detalle');
    if (tabla.style.display === "none" || tabla.style.display === "") {
        tabla.style.display = "block"; btn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Detalle'; btn.style.backgroundColor = "#6c757d";
    } else {
        tabla.style.display = "none"; btn.innerHTML = '<i class="fas fa-list"></i> Más Detalle'; btn.style.backgroundColor = "var(--azul-uab)";
    }
};