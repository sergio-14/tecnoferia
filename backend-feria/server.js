// Importar las librerías
require('dotenv').config(); 
process.env.TZ = 'America/La_Paz';

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const compression = require('compression'); 
const fileUpload = require('express-fileupload'); 
const bcrypt = require('bcryptjs'); 
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);

app.use(compression({
    filter: (req, res) => {
        if (req.path.endsWith('.pdf')) return false; 
        return compression.filter(req, res); 
    }
}));

app.use(helmet({ contentSecurityPolicy: false }));

const limitadorGlobal = rateLimit({ windowMs: 10 * 60 * 1000, max: 5000, message: { error: "⚠️ Demasiadas peticiones desde esta conexión." } });
app.use('/api/', limitadorGlobal); 
app.use(cors());
app.use(express.json({ limit: '5mb' })); 

app.use(fileUpload({ 
    createParentPath: true, 
    limits: { fileSize: 25 * 1024 * 1024 }, 
    abortOnLimit: true 
}));

const rutaFrontend = path.join(__dirname, '../');
const dirArchivos = path.join(__dirname, '../archivos_proyectos');

if (!fs.existsSync(dirArchivos)) { fs.mkdirSync(dirArchivos, { recursive: true }); }

app.use(express.static(rutaFrontend, { maxAge: '1d' }));

app.use('/archivos_proyectos', express.static(dirArchivos, {
    acceptRanges: true, 
    maxAge: '7d',       
    setHeaders: (res, pathStr) => {
        if (pathStr.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Access-Control-Allow-Origin', '*'); 
        }
    }
}));

app.use('/ver-pdf', express.static(dirArchivos, {
    acceptRanges: true, 
    maxAge: '7d',       
    setHeaders: (res, pathStr) => {
        if (pathStr.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Access-Control-Allow-Origin', '*'); 
        }
    }
}));

const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS, 
    port: process.env.DB_PORT,
});

db.connect()
    .then(async () => {
        console.log('✅ Conexión exitosa a PostgreSQL (tecno_feria_db)');
        
        await db.query(`CREATE TABLE IF NOT EXISTS sesiones_activas (ci_usuario VARCHAR(50) PRIMARY KEY, token VARCHAR(255) NOT NULL);`);
        await db.query(`CREATE TABLE IF NOT EXISTS configuraciones (id SERIAL PRIMARY KEY, fecha_registro TIMESTAMP, fecha_subida TIMESTAMP, fecha_resultados TIMESTAMP, fecha_cierre_votacion TIMESTAMP DEFAULT '2026-12-31 23:59:59', gps_latitud DECIMAL(15,8) DEFAULT -14.83391721, gps_longitud DECIMAL(15,8) DEFAULT -64.89965234, gps_radio INTEGER DEFAULT 5000);`);
        await db.query(`INSERT INTO configuraciones (id, fecha_registro, fecha_subida, fecha_resultados) VALUES (1, '2026-08-29 22:20:00', '2026-09-06 23:59:59', '2026-07-22 18:00:00') ON CONFLICT (id) DO NOTHING;`);
        await db.query(`CREATE TABLE IF NOT EXISTS instituciones (id SERIAL PRIMARY KEY, nombre VARCHAR(255) NOT NULL, tipo VARCHAR(100) NOT NULL);`);
        
        await db.query(`CREATE TABLE IF NOT EXISTS administradores (ci VARCHAR(50) PRIMARY KEY, nombre_completo VARCHAR(255), correo VARCHAR(255), celular VARCHAR(50), contrasena VARCHAR(255))`);
        await db.query(`CREATE TABLE IF NOT EXISTS expositores (ci VARCHAR(50) PRIMARY KEY, nombre_completo VARCHAR(255), institucion VARCHAR(255), correo VARCHAR(255), celular VARCHAR(50), contrasena VARCHAR(255))`);
        await db.query(`CREATE TABLE IF NOT EXISTS tribunales (usuario_tribunal VARCHAR(100) PRIMARY KEY, nombre_completo VARCHAR(255), especialidad VARCHAR(255), categoria_asignada VARCHAR(255), proyectos_asignados TEXT, correo VARCHAR(255), celular VARCHAR(50), contrasena VARCHAR(255))`);
        await db.query(`CREATE TABLE IF NOT EXISTS visitantes (ci VARCHAR(50) PRIMARY KEY, nombre_completo VARCHAR(255), institucion VARCHAR(255), celular VARCHAR(50))`);
        await db.query(`CREATE TABLE IF NOT EXISTS proyectos (id SERIAL PRIMARY KEY, ci_propietario VARCHAR(50) REFERENCES expositores(ci), titulo VARCHAR(500), categoria VARCHAR(255), integrantes TEXT, eje_tematico VARCHAR(255), enlace_pdf TEXT, fecha_ultima_edicion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, estado_evaluacion VARCHAR(100), nota_tribunal NUMERIC, nota_ponderada NUMERIC, observaciones_tribunal TEXT)`);
        await db.query(`CREATE TABLE IF NOT EXISTS votos_publico (id SERIAL PRIMARY KEY, id_proyecto INTEGER REFERENCES proyectos(id) ON DELETE CASCADE, ci_visitante VARCHAR(50) REFERENCES visitantes(ci), nota NUMERIC, latitud DECIMAL(15,8), longitud DECIMAL(15,8))`);
        await db.query(`CREATE TABLE IF NOT EXISTS evaluaciones_tribunal (id SERIAL PRIMARY KEY, id_proyecto INTEGER REFERENCES proyectos(id) ON DELETE CASCADE, usuario_tribunal VARCHAR(100), nota NUMERIC, observaciones TEXT)`);

        console.log('✅ Base de datos verificada y optimizada.');
    })
    .catch(err => console.error('❌ Error de conexión a PostgreSQL:', err.stack));

app.get('/api/usuarios_admin', async (req, res) => {
    try {
        const expositores = await db.query('SELECT ci as id, nombre_completo, institucion, celular, correo FROM expositores ORDER BY nombre_completo ASC');
        const tribunales = await db.query('SELECT usuario_tribunal as id, nombre_completo, especialidad as institucion, celular, correo FROM tribunales ORDER BY nombre_completo ASC');
        const visitantes = await db.query('SELECT ci as id, nombre_completo, institucion, celular, NULL as correo FROM visitantes ORDER BY nombre_completo ASC');
        res.json({ expositores: expositores.rows, tribunales: tribunales.rows, visitantes: visitantes.rows });
    } catch (error) { res.status(500).json({ error: "Error al cargar la lista de usuarios." }); }
});

app.delete('/api/usuarios_admin/:rol/:id', async (req, res) => {
    const { rol, id } = req.params;
    try {
        if (rol === 'expositor') {
            const proyectosUsuario = await db.query('SELECT id FROM proyectos WHERE ci_propietario = $1', [id]);
            for (let proy of proyectosUsuario.rows) {
                await db.query('DELETE FROM votos_publico WHERE id_proyecto = $1', [proy.id]);
                await db.query('DELETE FROM evaluaciones_tribunal WHERE id_proyecto = $1', [proy.id]);
            }
            await db.query('DELETE FROM proyectos WHERE ci_propietario = $1', [id]);
            await db.query('DELETE FROM expositores WHERE ci = $1', [id]);
        } 
        else if (rol === 'tribunal') {
            await db.query('DELETE FROM evaluaciones_tribunal WHERE usuario_tribunal = $1', [id]);
            await db.query('DELETE FROM tribunales WHERE usuario_tribunal = $1', [id]);
        } 
        else if (rol === 'visitante') {
            await db.query('DELETE FROM votos_publico WHERE ci_visitante = $1', [id]);
            await db.query('DELETE FROM visitantes WHERE ci = $1', [id]);
        } 
        res.json({ mensaje: `Usuario eliminado correctamente del sistema.` });
    } catch (error) { res.status(500).json({ error: "Error interno al intentar eliminar al usuario." }); }
});

app.get('/api/configuraciones', async (req, res) => {
    try {
        const query = `SELECT TO_CHAR(fecha_registro, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_registro, TO_CHAR(fecha_subida, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_subida, TO_CHAR(fecha_resultados, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_resultados, TO_CHAR(fecha_cierre_votacion, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_cierre_votacion, gps_latitud, gps_longitud, gps_radio FROM configuraciones WHERE id = 1`;
        const conf = await db.query(query);
        res.json(conf.rows[0] || {});
    } catch (error) { res.status(500).json({ error: "Error al obtener configuraciones" }); }
});

app.post('/api/configuraciones', async (req, res) => {
    const { fechaRegistro, fechaSubida, fechaResultados, fechaCierreVotacion, gpsLatitud, gpsLongitud, gpsRadio } = req.body;
    try {
        await db.query(`UPDATE configuraciones SET fecha_registro=$1, fecha_subida=$2, fecha_resultados=$3, fecha_cierre_votacion=$4, gps_latitud=$5, gps_longitud=$6, gps_radio=$7 WHERE id = 1`, [fechaRegistro, fechaSubida, fechaResultados, fechaCierreVotacion, gpsLatitud, gpsLongitud, gpsRadio]);
        res.json({ mensaje: "Configuraciones actualizadas correctamente" });
    } catch (error) { res.status(500).json({ error: "Error al actualizar fechas" }); }
});

app.get('/api/instituciones', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM institutions ORDER BY tipo DESC, nombre ASC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error al obtener instituciones" }); }
});

app.post('/api/instituciones', async (req, res) => {
    const { nombre, tipo } = req.body;
    try {
        await db.query('INSERT INTO instituciones (nombre, tipo) VALUES ($1, $2)', [nombre, tipo]);
        res.json({ mensaje: "Institución agregada" });
    } catch (error) { res.status(500).json({ error: "Error al agregar institución" }); }
});

app.delete('/api/instituciones/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM instituciones WHERE id = $1', [req.params.id]);
        res.json({ mensaje: "Institución eliminada" });
    } catch (error) { res.status(500).json({ error: "Error al eliminar institución" }); }
});

app.post('/api/login', async (req, res) => {
    const { identificador, password } = req.body;
    try {
        let rolEncontrado = null; let datosEncontrados = null; let hashBd = null;
        const queries = [
            { rol: 'ADMIN', query: 'SELECT * FROM administradores WHERE ci = $1 OR correo = $1' },
            { rol: 'EXPOSITOR', query: 'SELECT * FROM expositores WHERE ci = $1 OR correo = $1' },
            { rol: 'TRIBUNAL', query: 'SELECT * FROM tribunales WHERE usuario_tribunal = $1 OR correo = $1' }
        ];

        for (let q of queries) {
            const result = await db.query(q.query, [identificador]);
            if (result.rows.length > 0) { rolEncontrado = q.rol; datosEncontrados = result.rows[0]; hashBd = datosEncontrados.contrasena; break; }
        }

        if (!rolEncontrado) {
            const visitante = await db.query('SELECT * FROM visitantes WHERE ci = $1', [identificador]);
            if (visitante.rows.length > 0) {
                if (password === identificador) { rolEncontrado = 'VISITANTE'; datosEncontrados = visitante.rows[0]; } 
                else { return res.status(401).json({ error: "Usuario o contraseña incorrectos." }); }
            }
        }

        if (!rolEncontrado) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });

        if (rolEncontrado !== 'VISITANTE') {
            if (!hashBd || !(await bcrypt.compare(password, hashBd))) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        }

        const ciUsuario = datosEncontrados.ci || datosEncontrados.usuario_tribunal;
        const nuevoToken = Date.now().toString(36) + Math.random().toString(36).substring(2);
        
        await db.query(`INSERT INTO sesiones_activas (ci_usuario, token) VALUES ($1, $2) ON CONFLICT (ci_usuario) DO UPDATE SET token = EXCLUDED.token`, [ciUsuario, nuevoToken]);
        res.json({ rol: rolEncontrado, datos: datosEncontrados, token: nuevoToken });
    } catch (error) { res.status(500).json({ error: "Error interno del servidor al procesar el login." }); }
});

app.get('/api/verificar_sesion/:identificador/:token', async (req, res) => {
    try {
        const { identificador, token } = req.params;
        const result = await db.query('SELECT token FROM sesiones_activas WHERE ci_usuario = $1', [identificador]);
        if (result.rows.length === 0) return res.json({ valida: false });
        res.json({ valida: result.rows[0].token === token }); 
    } catch (error) { res.status(500).json({ valida: true }); }
});

app.get('/api/usuarios/:identificador', async (req, res) => {
    const { identificador } = req.params;
    try {
        let rolEncontrado = null; let datosEncontrados = null;
        const admin = await db.query('SELECT * FROM administradores WHERE ci = $1', [identificador]);
        if (admin.rows.length > 0) { rolEncontrado = 'ADMIN'; datosEncontrados = admin.rows[0]; }

        if (!rolEncontrado) {
            const expositor = await db.query('SELECT * FROM expositores WHERE ci = $1', [identificador]);
            if (expositor.rows.length > 0) { rolEncontrado = 'EXPOSITOR'; datosEncontrados = expositor.rows[0]; }
        }
        
        if (!rolEncontrado) {
            const visitante = await db.query('SELECT * FROM visitantes WHERE ci = $1', [identificador]);
            if (visitante.rows.length > 0) { rolEncontrado = 'VISITANTE'; datosEncontrados = visitante.rows[0]; }
        }

        if (!rolEncontrado) return res.status(404).json({ error: "Usuario no encontrado." });
        res.json({ rol: rolEncontrado, datos: datosEncontrados });
    } catch (error) { res.status(500).json({ error: "Error interno del servidor." }); }
});

app.post('/api/restablecer_password_directo', async (req, res) => {
    const { ci, correo, nuevaPassword } = req.body;
    try {
        let tabla = null;
        if ((await db.query('SELECT * FROM administradores WHERE ci = $1 AND correo = $2', [ci, correo])).rows.length > 0) tabla = 'administradores';
        else if ((await db.query('SELECT * FROM expositores WHERE ci = $1 AND correo = $2', [ci, correo])).rows.length > 0) tabla = 'expositores';
        else if ((await db.query('SELECT * FROM tribunales WHERE usuario_tribunal = $1 AND correo = $2', [ci, correo])).rows.length > 0) tabla = 'tribunales';

        if (!tabla) return res.status(404).json({ error: "⛔ Datos incorrectos." });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(nuevaPassword, salt);

        if (tabla === 'administradores') await db.query('UPDATE administradores SET contrasena = $1 WHERE ci = $2', [hash, ci]);
        if (tabla === 'expositores') await db.query('UPDATE expositores SET contrasena = $1 WHERE ci = $2', [hash, ci]);
        if (tabla === 'tribunales') await db.query('UPDATE tribunales SET contrasena = $1 WHERE usuario_tribunal = $2', [hash, ci]);

        res.json({ mensaje: "Contraseña actualizada." });
    } catch (error) { res.status(500).json({ error: "Error al cambiar la contraseña." }); }
});

app.post('/api/administradores', async (req, res) => {
    const { ci, nombre, correo, celular, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await db.query('INSERT INTO administradores (ci, nombre_completo, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5)', [ci, nombre, correo, celular, hash]);
        res.status(201).json({ mensaje: "Administrador guardado exitosamente." });
    } catch (error) { res.status(500).json({ error: "Error al guardar administrador." }); }
});

app.post('/api/expositores', async (req, res) => {
    const { ci, nombreCompleto, institucion, correo, celular, password, integrantesExtra } = req.body;
    try {
        const salt = await bcrypt.genSalt(10); 
        const hash = await bcrypt.hash(password, salt);
        await db.query(`INSERT INTO expositores (ci, nombre_completo, institucion, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ci) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, institucion = EXCLUDED.institucion, correo = EXCLUDED.correo, celular = EXCLUDED.celular`, [ci, nombreCompleto, institucion, correo, celular, hash]);

        if (integrantesExtra && Array.isArray(integrantesExtra)) {
            for (const integrante of integrantesExtra) {
                const passTemp = await bcrypt.hash(integrante.ci, salt);
                await db.query(`INSERT INTO expositores (ci, nombre_completo, institucion, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ci) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, institucion = EXCLUDED.institucion, correo = EXCLUDED.correo, celular = EXCLUDED.celular`, [integrante.ci, integrante.nombre, integrante.institucion || institucion, integrante.correo || correo, integrante.celular || 'S/N', passTemp]);
            }
        }
        res.status(201).json({ mensaje: "Expositor e integrantes guardados." });
    } catch (error) { res.status(500).json({ error: "Error al guardar expositor." }); }
});

app.post('/api/tribunales', async (req, res) => {
    const { usuario, nombre, especialidad, categoria, proyectosAsignados, correo, celular, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
        await db.query(`INSERT INTO tribunales (usuario_tribunal, nombre_completo, especialidad, categoria_asignada, proyectos_asignados, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [usuario, nombre, especialidad, categoria, proyectosAsignados, correo, celular, hash]);
        res.status(201).json({ mensaje: "✅ Tribunal guardado." });
    } catch (error) { res.status(500).json({ error: "Error al guardar el tribunal." }); }
});

app.post('/api/proyectos', async (req, res) => {
    const { ciPropietario, titulo, categoria, integrantes, ejeTematico, enlacePdfExistente, nuevoIntento, integrantesData } = req.body;
    try {
        const user = await db.query('SELECT nombre_completo FROM expositores WHERE ci = $1', [ciPropietario]);
        if (user.rows.length === 0) return res.status(404).json({ error: "Expositor no encontrado" });
        
        const nombreLider = user.rows[0].nombre_completo;
        const ci = ciPropietario;

        let enlacePdfFinal = enlacePdfExistente || null;
        if (enlacePdfFinal === 'null' || enlacePdfFinal === 'undefined' || enlacePdfFinal === '') {
            enlacePdfFinal = null;
        }

        let subcarpeta = 'otros';
        if (categoria.includes('estudiante')) subcarpeta = 'Estudiantes_Pregrado';
        else if (categoria.includes('docente')) subcarpeta = 'Docentes_Investigadores';
        else if (categoria.includes('emprendimiento')) subcarpeta = 'Emprendimientos';

        const dirDestino = path.join(__dirname, '../archivos_proyectos/', subcarpeta);
        if (!fs.existsSync(dirDestino)) { fs.mkdirSync(dirDestino, { recursive: true }); }
        
        if (req.files && req.files.proyArchivo) {
            const archivo = req.files.proyArchivo;
            const nombreSeguro = `${ci}_${Date.now()}.pdf`;
            await archivo.mv(path.join(dirDestino, nombreSeguro));
            enlacePdfFinal = `/archivos_proyectos/${subcarpeta}/${nombreSeguro}`;
        }

        let formatoParaDB = "";
        if (integrantesData && integrantesData !== "[]") {
            formatoParaDB = `⭐ LÍDER: ${nombreLider} | ${integrantes ? '👥 EQUIPO: ' + integrantes : ''} ||| ${integrantesData}`;
        } else {
            formatoParaDB = `⭐ LÍDER: ${nombreLider} ||| []`;
        }

        if (nuevoIntento === 'true') {
            await db.query('INSERT INTO proyectos (ci_propietario, titulo, categoria, integrantes, eje_tematico, enlace_pdf) VALUES ($1, $2, $3, $4, $5, $6)', [ci, titulo, categoria, formatoParaDB, ejeTematico, enlacePdfFinal]);
        } else {
            const check = await db.query('SELECT id, estado_evaluacion FROM proyectos WHERE ci_propietario = $1 ORDER BY id DESC LIMIT 1', [ci]);
            if (check.rows.length > 0) {
                const idProyecto = check.rows[0].id;
                
                if (check.rows[0].estado_evaluacion === 'Evaluado (No clasifica)') {
                    await db.query('DELETE FROM evaluaciones_tribunal WHERE id_proyecto = $1', [idProyecto]);
                    await db.query(`UPDATE proyectos SET titulo=$1, categoria=$2, integrantes=$3, eje_tematico=$4, enlace_pdf=COALESCE($5, enlace_pdf), fecha_ultima_edicion=CURRENT_TIMESTAMP, estado_evaluacion=NULL, nota_tribunal=NULL, nota_ponderada=NULL, observaciones_tribunal=NULL WHERE id=$6`, [titulo, categoria, formatoParaDB, ejeTematico, enlacePdfFinal, idProyecto]);
                } else {
                    await db.query(`UPDATE proyectos SET titulo=$1, categoria=$2, integrantes=$3, eje_tematico=$4, enlace_pdf=COALESCE($5, enlace_pdf), fecha_ultima_edicion=CURRENT_TIMESTAMP WHERE id=$6`, [titulo, categoria, formatoParaDB, ejeTematico, enlacePdfFinal, idProyecto]);
                }
            } else {
                await db.query('INSERT INTO proyectos (ci_propietario, titulo, categoria, integrantes, eje_tematico, enlace_pdf) VALUES ($1, $2, $3, $4, $5, $6)', [ci, titulo, categoria, formatoParaDB, ejeTematico, enlacePdfFinal]);
            }
        }

        if (integrantesData) {
            try {
                const arrExtra = JSON.parse(integrantesData);
                const salt = await bcrypt.genSalt(10);
                for (let member of arrExtra) {
                    if (!member.ci || !member.nombre) continue;
                    const passHash = await bcrypt.hash(member.ci, salt); 
                    await db.query(`INSERT INTO expositores (ci, nombre_completo, institucion, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ci) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, institucion = EXCLUDED.institucion, correo = EXCLUDED.correo, celular = EXCLUDED.celular`, [member.ci, member.nombre, member.institucion, member.correo, member.celular || 'S/N', passHash]);
                }
            } catch (e) {}
        }

        res.status(201).json({ mensaje: "Proyecto y equipo guardados con éxito" });
    } catch (error) { res.status(500).json({ error: "Error al guardar proyecto" }); }
});

app.get('/api/proyectos/:ci', async (req, res) => {
    try {
        const ci = req.params.ci;
        const like1 = `%"ci":"${ci}"%`;
        const like2 = `%CI: ${ci}%`;
        const like3 = `%CI:${ci}%`;
        
        const proy = await db.query(
            `SELECT * FROM proyectos 
             WHERE ci_propietario = $1 
             OR integrantes LIKE $2 
             OR integrantes LIKE $3 
             OR integrantes LIKE $4 
             ORDER BY id DESC LIMIT 1`, 
            [ci, like1, like2, like3]
        );
        
        if (proy.rows.length === 0) return res.json(null);
        
        const proyecto = proy.rows[0];
        proyecto.esLider = (String(proyecto.ci_propietario).trim() === String(ci).trim());
        res.json(proyecto);
    } catch (error) { res.status(500).json({ error: "Error al buscar proyecto" }); }
});

app.get('/api/proyectos_admin', async (req, res) => {
    try {
        const proyectos = await db.query(`
            SELECT p.id, p.titulo, p.categoria, p.integrantes, p.enlace_pdf, p.estado_evaluacion, p.ci_propietario, e.nombre_completo AS nombre_lider
            FROM proyectos p
            LEFT JOIN expositores e ON p.ci_propietario = e.ci
            ORDER BY p.id DESC
        `);
        
        const proysLimpios = proyectos.rows.map(p => {
            let infoLimpia = p.integrantes || "";
            let nombreLider = p.nombre_lider || "Líder Desconocido";
            let ciLider = String(p.ci_propietario).trim(); 
            
            const normalizar = str => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const liderNorm = normalizar(nombreLider);
            const pLider = liderNorm.split(' ');
            const n1 = pLider[0];
            const a1 = pLider.find(palabra => palabra.length > 2 && palabra !== n1) || '';

            const esElLider = (nombreEvaluar) => {
                const norm = normalizar(nombreEvaluar);
                if (norm.length > liderNorm.length + 15) return false; 
                if (norm === liderNorm) return true;
                if (n1 && a1 && norm.includes(n1) && norm.includes(a1)) return true; 
                return false;
            };

            if (infoLimpia.includes('|||')) {
                try {
                    const partes = infoLimpia.split('|||');
                    const textoFront = partes[0].trim();
                    const jsonBack = JSON.parse(partes[1].trim());
                    
                    if(textoFront.includes('⭐ LÍDER:')) {
                        nombreLider = textoFront.split('⭐ LÍDER:')[1].split('|')[0].trim();
                    }
                    
                    let htmlEquipo = "";
                    if(jsonBack && jsonBack.length > 0) {
                        const equipoFiltrado = jsonBack.filter(m => String(m.ci).trim() !== ciLider && !esElLider(m.nombre));
                        if (equipoFiltrado.length > 0) {
                            htmlEquipo = '<br><strong style="color: #28a745;"><i class="fas fa-users"></i> EQUIPO:</strong><br>' + 
                                         equipoFiltrado.map(m => `<span style="font-size: 0.9em;">&bull; ${m.nombre} (CI: ${m.ci})</span>`).join('<br>');
                        }
                    }
                    
                    infoLimpia = `<strong style="color: #4db8ff;"><i class="fas fa-crown"></i> LÍDER:</strong> ${nombreLider}${htmlEquipo}`;
                } catch(e) {
                    infoLimpia = infoLimpia.split('|||')[0].trim()
                                           .replace('⭐ LÍDER:', '<strong style="color: #4db8ff;"><i class="fas fa-crown"></i> LÍDER:</strong>')
                                           .replace(/\|\s*👥 EQUIPO:/, '<br><strong style="color: #28a745;"><i class="fas fa-users"></i> EQUIPO:</strong><br>');
                }
            } else {
                let htmlEquipo = "";
                let textoRaw = infoLimpia.replace('⭐ LÍDER:', '').replace(/\|\s*👥 EQUIPO:/, '').trim();
                
                if (textoRaw !== "" && !esElLider(textoRaw)) {
                     let listaOld = [];
                     
                     if (/\d\./.test(textoRaw)) {
                         listaOld = textoRaw.split(/\d+\./).map(s=>s.replace(/^[^a-zA-Z]+/, '').trim()).filter(s => s.length > 2 && !esElLider(s));
                     } else if (textoRaw.includes(',') || textoRaw.toLowerCase().includes(' y ')) {
                         listaOld = textoRaw.split(/,(?![^\(]*\))|\by\b|\(integrante\)/i).map(s=>s.trim()).filter(s => s.length > 2 && !esElLider(s));
                     } else {
                         listaOld = [textoRaw];
                     }

                     if (listaOld.length > 0) {
                         htmlEquipo = '<br><strong style="color: #28a745;"><i class="fas fa-users"></i> EQUIPO:</strong><br>' + 
                                      listaOld.map(m => `<span style="font-size: 0.9em;">&bull; ${m}</span>`).join('<br>');
                     }
                }
                infoLimpia = `<strong style="color: #4db8ff;"><i class="fas fa-crown"></i> LÍDER:</strong> ${nombreLider}${htmlEquipo}`;
            }
            
            return { ...p, integrantes: infoLimpia };
        });
        res.json(proysLimpios);
    } catch (error) { res.status(500).json({ error: "Error al cargar proyectos" }); }
});

app.get('/api/proyectos_qr/:id', async (req, res) => {
    try {
        const proy = await db.query('SELECT * FROM proyectos WHERE id = $1', [req.params.id]);
        res.json(proy.rows.length > 0 ? proy.rows[0] : null);
    } catch (error) { res.status(500).json({ error: "Error del servidor" }); }
});

app.delete('/api/proyectos_admin/:id', async (req, res) => {
    try {
        const idProyecto = req.params.id;
        await db.query('DELETE FROM votos_publico WHERE id_proyecto = $1', [idProyecto]);
        await db.query('DELETE FROM evaluaciones_tribunal WHERE id_proyecto = $1', [idProyecto]);
        await db.query('DELETE FROM proyectos WHERE id = $1', [idProyecto]);
        res.json({ mensaje: "Proyecto eliminado." });
    } catch (error) { res.status(500).json({ error: "Error interno." }); }
});

app.post('/api/visitantes', async (req, res) => {
    const { ci, nombreCompleto, institucion, celular } = req.body;
    try {
        if ((await db.query('SELECT * FROM visitantes WHERE ci = $1', [ci])).rows.length > 0) return res.status(400).json({ error: "C.I. ya habilitado." });
        let nombreFinal = nombreCompleto; let institucionFinal = institucion;
        const checkExpositor = await db.query('SELECT * FROM expositores WHERE ci = $1', [ci]);
        if (checkExpositor.rows.length > 0) { nombreFinal = checkExpositor.rows[0].nombre_completo; institucionFinal = checkExpositor.rows[0].institucion; }
        const nuevoVisitante = await db.query(`INSERT INTO visitantes (ci, nombre_completo, institucion, celular) VALUES ($1, $2, $3, $4) RETURNING *`, [ci, nombreFinal, institucionFinal, celular]);
        res.status(201).json({ mensaje: "✅ Visitante habilitado", visitante: nuevoVisitante.rows[0] });
    } catch (error) { res.status(500).json({ error: "Error al habilitar." }); }
});

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
}

app.get('/api/verificar_voto_duplicado/:ci/:idProy', async (req, res) => {
    try {
        const { ci, idProy } = req.params;
        const dup = await db.query('SELECT id FROM votos_publico WHERE ci_visitante = $1 AND id_proyecto = $2', [ci, idProy]);
        res.json({ yaVoto: dup.rows.length > 0 });
    } catch (error) { res.status(500).json({ error: "Error interno al verificar duplicidad." }); }
});

// 🔥 ANTI-FRAUDE: SE ACEPTA DEV- PERO SE REVISA LA COOKIE NINJA 🔥
app.post('/api/votar', async (req, res) => {
    const { idProyecto, ci, ciNinja, nota, lat, lon, institucionVisitante } = req.body;
    try {
        const checkTime = await db.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz' > fecha_cierre_votacion) as votacion_cerrada, gps_latitud, gps_longitud, gps_radio FROM configuraciones WHERE id = 1`);
        if (checkTime.rows[0].votacion_cerrada) return res.status(400).json({ error: "⏳ El periodo de votación del público ha finalizado." });

        const proyCheck = await db.query('SELECT ci_propietario, integrantes FROM proyectos WHERE id = $1', [idProyecto]);
        
        if (proyCheck.rows.length > 0) {
            const propietario = String(proyCheck.rows[0].ci_propietario).trim();
            const integrantesStringDB = proyCheck.rows[0].integrantes || "";
            const ciReq = String(ci).trim();
            const ninjaReq = ciNinja ? String(ciNinja).trim() : null;

            let esMiembroEquipo = false;
            if (propietario === ciReq || propietario === ninjaReq) esMiembroEquipo = true;
            if (integrantesStringDB.includes(`"ci":"${ciReq}"`) || integrantesStringDB.includes(`CI: ${ciReq}`)) esMiembroEquipo = true;
            if (ninjaReq && (integrantesStringDB.includes(`"ci":"${ninjaReq}"`) || integrantesStringDB.includes(`CI: ${ninjaReq}`))) esMiembroEquipo = true;

            if (esMiembroEquipo) {
                return res.status(400).json({ error: "⛔ Fraude Detectado por Servidor: Este dispositivo o usuario pertenece al equipo de este proyecto. Tu voto ha sido bloqueado." });
            }
        }
        
        if ((await db.query('SELECT ci FROM visitantes WHERE ci = $1', [ci])).rows.length === 0) {
            const checkExp = await db.query('SELECT nombre_completo, institucion, celular FROM expositores WHERE ci = $1', [ci]);
            if (checkExp.rows.length > 0) {
                await db.query(`INSERT INTO visitantes (ci, nombre_completo, institucion, celular) VALUES ($1, $2, $3, $4)`, [ci, checkExp.rows[0].nombre_completo, checkExp.rows[0].institucion, checkExp.rows[0].celular]);
            } else {
                await db.query(`INSERT INTO visitantes (ci, nombre_completo, institucion, celular) VALUES ($1, $2, $3, 'S/N')`, [ci, ci.startsWith('DEV-') ? 'Visitante (Móvil)' : 'Visitante Habilitado', institucionVisitante || 'Visitante Anónimo (Dispositivo)']);
            }
        }

        if ((await db.query('SELECT id FROM votos_publico WHERE ci_visitante = $1 AND id_proyecto = $2', [ci, idProyecto])).rows.length > 0) return res.status(400).json({ error: "Ya calificaste este proyecto anteriormente." });
        
        await db.query('INSERT INTO votos_publico (id_proyecto, ci_visitante, nota, latitud, longitud) VALUES ($1, $2, $3, $4, $5)', [idProyecto, ci, parseInt(nota, 10), lat, lon]);
        res.status(201).json({ mensaje: "✅ Voto registrado exitosamente." });
    } catch (error) { res.status(500).json({ error: "Error en la Base de Datos: " + error.message }); }
});

app.get('/api/votos_admin', async (req, res) => {
    try {
        const query = `SELECT v.id as id_voto, v.nota, p.titulo as nombre_proyecto, p.categoria as categoria_proyecto, vis.nombre_completo as nombre_visitante, vis.institucion as institucion FROM votos_publico v JOIN proyectos p ON v.id_proyecto = p.id JOIN visitantes vis ON v.ci_visitante = vis.ci ORDER BY v.id DESC`;
        const votos = await db.query(query);
        res.json(votos.rows);
    } catch (error) { res.status(500).json({ error: "Error al cargar los votos" }); }
});

app.delete('/api/votos_admin/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM votos_publico WHERE id = $1', [req.params.id]);
        res.json({ mensaje: "Voto eliminado" });
    } catch (error) { res.status(500).json({ error: "Error al eliminar el voto" }); }
});

app.delete('/api/evaluaciones_admin/:id', async (req, res) => {
    try {
        const evCheck = await db.query('SELECT id_proyecto FROM evaluaciones_tribunal WHERE id = $1', [req.params.id]);
        if (evCheck.rows.length > 0) {
            const idProyecto = evCheck.rows[0].id_proyecto;
            await db.query('DELETE FROM evaluaciones_tribunal WHERE id = $1', [req.params.id]);
            await db.query('UPDATE proyectos SET nota_tribunal=NULL, nota_ponderada=NULL, observaciones_tribunal=NULL, estado_evaluacion=NULL WHERE id = $1', [idProyecto]);
        }
        res.json({ mensaje: "Evaluación eliminada." });
    } catch (error) { res.status(500).json({ error: "Error al eliminar la evaluación." }); }
});

app.get('/api/tribunal_correo/:correo', async (req, res) => {
    try {
        const tribunal = await db.query('SELECT * FROM tribunales WHERE correo = $1', [req.params.correo]);
        res.json(tribunal.rows[0] || null);
    } catch (error) { res.status(500).json({ error: "Error al buscar tribunal" }); }
});

app.post('/api/evaluar', async (req, res) => {
    const { idProyecto, correoTribunal, notaTribunal, observaciones } = req.body;
    try {
        const tribunalData = await db.query('SELECT usuario_tribunal FROM tribunales WHERE correo = $1', [correoTribunal]);
        if (tribunalData.rows.length === 0) return res.status(404).json({ error: "Tribunal no encontrado." });
        const usuarioTribunal = tribunalData.rows[0].usuario_tribunal;

        if ((await db.query('SELECT id FROM evaluaciones_tribunal WHERE id_proyecto = $1 AND usuario_tribunal = $2', [idProyecto, usuarioTribunal])).rows.length > 0) return res.status(400).json({ error: "⛔ Ya registraste una calificación." });

        await db.query('INSERT INTO evaluaciones_tribunal (id_proyecto, usuario_tribunal, nota, observaciones) VALUES ($1, $2, $3, $4)', [idProyecto, usuarioTribunal, notaTribunal, observaciones]);

        const notaPonderada = notaTribunal * 0.80;
        let estado = notaPonderada >= 51 ? 'Pre-seleccionado' : 'Evaluado (No clasifica)';

        await db.query('UPDATE proyectos SET nota_tribunal = $1, nota_ponderada = $2, observaciones_tribunal = $3, estado_evaluacion = $4 WHERE id = $5', [notaTribunal, notaPonderada, observaciones, estado, idProyecto]);

        const proyData = await db.query('SELECT p.titulo, e.correo, e.nombre_completo FROM proyectos p JOIN expositores e ON p.ci_propietario = e.ci WHERE p.id = $1', [idProyecto]);

        res.status(201).json({ mensaje: "✅ Evaluación guardada", estado: estado, notaPonderada: notaPonderada, correoEstudiante: proyData.rows.length > 0 ? proyData.rows[0].correo : "", nombreExpositor: proyData.rows.length > 0 ? proyData.rows[0].nombre_completo : "", tituloProyecto: proyData.rows.length > 0 ? proyData.rows[0].titulo : "Proyecto" });
    } catch (error) { res.status(500).json({ error: "Error al evaluar" }); }
});

app.get('/api/evaluaciones_admin', async (req, res) => {
    try {
        const query = `SELECT e.id as id_evaluacion, COALESCE(t.nombre_completo, e.usuario_tribunal) as nombre_tribunal, e.nota, p.titulo as nombre_proyecto, p.categoria FROM evaluaciones_tribunal e JOIN proyectos p ON e.id_proyecto = p.id LEFT JOIN tribunales t ON e.usuario_tribunal = t.usuario_tribunal ORDER BY e.id DESC`;
        const evals = await db.query(query);
        res.json(evals.rows);
    } catch (error) { res.status(500).json({ error: "Error al cargar las evaluaciones" }); }
});

app.get('/api/datos_informes', async (req, res) => {
    try {
        const proyectos = await db.query('SELECT * FROM proyectos');
        const expositores = await db.query('SELECT * FROM expositores');
        const tribunales = await db.query('SELECT * FROM tribunales');
        const visitantes = await db.query('SELECT * FROM visitantes');
        const votos = await db.query('SELECT * FROM votos_publico');
        const evaluaciones = await db.query('SELECT * FROM evaluaciones_tribunal');

        res.json({ proyectos: proyectos.rows, expositores: expositores.rows, tribunales: tribunales.rows, visitantes: visitantes.rows, votos: votos.rows, evaluaciones: evaluaciones.rows });
    } catch (error) { res.status(500).json({ error: "Error al empaquetar los datos" }); }
});

app.get('/api/resultados', async (req, res) => {
    const { ci } = req.query;
    try {
        const checkTime = await db.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz' < fecha_resultados) as resultados_ocultos FROM configuraciones WHERE id = 1`);
        let esAdmin = false;
        if (ci && ci !== "publico") {
            if ((await db.query('SELECT ci FROM administradores WHERE ci = $1', [ci])).rows.length > 0) esAdmin = true;
        }

        if (checkTime.rows[0].resultados_ocultos && !esAdmin) return res.status(403).json({ error: "⛔ Bloqueo Backend: Los resultados aún no son públicos." });

        const query = `SELECT p.titulo, p.categoria, COALESCE(p.nota_ponderada, 0) as tribunal_80, COALESCE((SELECT AVG(nota) FROM votos_publico WHERE id_proyecto::text = p.id::text), 0) as promedio_votos_100 FROM proyectos p WHERE p.estado_evaluacion = 'Pre-seleccionado'`;
        const resultados = await db.query(query);
        
        const dataFinal = resultados.rows.map(r => {
            const t80 = parseFloat(r.tribunal_80) || 0;
            const promVotos = parseFloat(r.promedio_votos_100) || 0;
            const p20 = promVotos * 0.20; 
            return { titulo: r.titulo, categoria: r.categoria, tribunal_80: t80, publico_20: p20, nota_final: t80 + p20 };
        }).sort((a, b) => b.nota_final - a.nota_final);
        
        res.json(dataFinal);
    } catch (error) { res.status(500).json({ error: "Error al calcular estadísticas" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend Seguro corriendo en el puerto: ${PORT}`);
});