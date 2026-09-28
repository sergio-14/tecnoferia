// =========================================================================
// ARCHIVO: features/registroTribunal/registroTribunal.js
// FUNCIÓN: Migrado a PostgreSQL con Encriptación y FIX AntiBloqueos
// =========================================================================

window.registrarNuevoTribunal = async function(e) {
    e.preventDefault();

    const nombre = document.getElementById('tribNombre').value.trim();
    const especialidad = document.getElementById('tribEspecialidad').value.trim();
    const categoriaValor = document.getElementById('tribCategoria').value; 
    const categoriaTexto = document.getElementById('tribCategoria').options[document.getElementById('tribCategoria').selectedIndex].text; 
    const correo = document.getElementById('tribCorreo').value.trim();
    const celular = document.getElementById('tribCelular').value.trim();
    const usuario = document.getElementById('tribUsuario').value.trim();
    const password = document.getElementById('tribPass').value;

    const btn = document.getElementById('btnGuardarTribunal');
    const textoOriginal = btn.innerHTML;
    
    let arrayProyectosAsignados = "TODOS";
    let textoProyectosParaCorreo = " TODOS LOS PROYECTOS DE LA CATEGORÍA";

    const elAlcance = document.getElementById('tribAlcance');
    if (elAlcance && elAlcance.value === "ESPECIFICOS") {
        const marcados = document.querySelectorAll('input[name="proy_tribunal_check"]:checked');
        
        arrayProyectosAsignados = Array.from(marcados).map(cb => cb.value);
        const nombresProyectos = Array.from(marcados).map(cb => cb.parentElement.textContent.trim());
        textoProyectosParaCorreo = nombresProyectos.join(" \n• ");
        
        if (arrayProyectosAsignados.length === 0) {
            alert("⚠️ ATENCIÓN: Has elegido 'Asignar proyectos específicos' pero no marcaste ningún casillero.");
            return;
        }
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando credenciales...';
    btn.disabled = true;

    try {
        const payload = {
            usuario: usuario,
            nombre: nombre,
            especialidad: especialidad,
            categoria: categoriaValor,
            proyectosAsignados: typeof arrayProyectosAsignados === 'string' ? arrayProyectosAsignados : JSON.stringify(arrayProyectosAsignados),
            correo: correo,
            celular: celular,
            password: password 
        };

        const respuesta = await fetch('/api/tribunales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(errorData.error || "Error al guardar los datos del tribunal.");
        }

        //  FIX ANTIBLOQUEO: Intentamos mandar el correo 
        let correoEnviado = false;
        try {
            if (typeof emailjs !== 'undefined') {
                emailjs.init({ publicKey: "njcIu3KNPNiVrfy9f" }); // Inicialización obligatoria
                
                // IMPORTANTE: Pasamos la publicKey (4to parámetro) para evitar el error de autenticación
                await emailjs.send("service_m4ueyce", "template_c8zd2xj", {
                    nombre_tribunal: nombre,
                    correo_destino: correo,
                    usuario_asignado: usuario,
                    password_asignado: password,
                    categoria_asignada: categoriaTexto,
                    proyectos_asignados: textoProyectosParaCorreo,
                    enlace_sistema: window.location.origin
                }, "njcIu3KNPNiVrfy9f"); 
                
                correoEnviado = true;
            }
        } catch (errorCorreo) {
            console.error("Fallo EmailJS:", errorCorreo);
        }

        if (correoEnviado) {
            alert(` Tribunal registrado exitosamente.\n\nUsuario: ${usuario}\nContraseña enviada al correo.`);
        } else {
            alert(` TRIBUNAL REGISTRADO, PERO EL CORREO FALLÓ.\n\nTu navegador bloqueó el envío automático o hay un error en EmailJS.\nPor favor, entrega estas credenciales manualmente:\n\n👤 Usuario: ${usuario}\n🔑 Contraseña: ${password}`);
        }
        
        e.target.reset();
        const contProy = document.getElementById('contenedor-lista-proyectos');
        if (contProy) contProy.style.display = "none";

    } catch (error) {
        console.error("Error al registrar tribunal:", error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};