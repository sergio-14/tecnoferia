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
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));

const limitadorGlobal = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5000, 
    message: { error: "⚠️ Demasiadas peticiones desde esta conexión." }
});
app.use('/api/', limitadorGlobal); 
app.use(cors());
app.use(express.json({ limit: '2mb' })); 
app.use(fileUpload({ createParentPath: true, limits: { fileSize: 15 * 1024 * 1024 } }));

const rutaFrontend = path.join(__dirname, '../');
const dirArchivos = path.join(__dirname, '../archivos_proyectos');

if (!fs.existsSync(dirArchivos)) { fs.mkdirSync(dirArchivos, { recursive: true }); }

app.use(express.static(rutaFrontend, { maxAge: '1d' }));
app.use('/archivos_proyectos', express.static(dirArchivos));

app.use('/ver-pdf', express.static(dirArchivos, {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="Documento_TecnoFeria.pdf"'); 
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

        try { await db.query(`ALTER TABLE votos_publico DROP CONSTRAINT IF EXISTS votos_publico_nota_check;`); } catch(e) {}
        try { await db.query(`ALTER TABLE administradores ADD COLUMN IF NOT EXISTS celular VARCHAR(50);`); } catch(e){}
        try { await db.query(`ALTER TABLE tribunales ADD COLUMN IF NOT EXISTS celular VARCHAR(50);`); } catch(e){}
        try { await db.query(`ALTER TABLE visitantes ADD COLUMN IF NOT EXISTS celular VARCHAR(50);`); } catch(e){}
        try { await db.query(`ALTER TABLE votos_publico ADD COLUMN IF NOT EXISTS latitud DECIMAL(15,8);`); } catch(e){}
        try { await db.query(`ALTER TABLE votos_publico ADD COLUMN IF NOT EXISTS longitud DECIMAL(15,8);`); } catch(e){}

        try { await db.query(`ALTER TABLE configuraciones ADD COLUMN IF NOT EXISTS fecha_cierre_votacion TIMESTAMP DEFAULT '2026-12-31 23:59:59';`); } catch(e){}
        try { await db.query(`ALTER TABLE configuraciones ADD COLUMN IF NOT EXISTS gps_latitud DECIMAL(15,8) DEFAULT -14.83391721;`); } catch(e){}
        try { await db.query(`ALTER TABLE configuraciones ADD COLUMN IF NOT EXISTS gps_longitud DECIMAL(15,8) DEFAULT -64.89965234;`); } catch(e){}
        try { await db.query(`ALTER TABLE configuraciones ADD COLUMN IF NOT EXISTS gps_radio INTEGER DEFAULT 5000;`); } catch(e){}

        try { await db.query(`CREATE INDEX IF NOT EXISTS idx_proyectos_ci ON proyectos(ci_propietario);`); } catch(e){}
        try { await db.query(`CREATE INDEX IF NOT EXISTS idx_votos_proy ON votos_publico(id_proyecto);`); } catch(e){}
        try { await db.query(`CREATE INDEX IF NOT EXISTS idx_votos_ci ON votos_publico(ci_visitante);`); } catch(e){}
        try { await db.query(`CREATE INDEX IF NOT EXISTS idx_eval_proy ON evaluaciones_tribunal(id_proyecto);`); } catch(e){}

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
        else { return res.status(400).json({ error: "Rol no válido." }); }

        res.json({ mensaje: `Usuario eliminado correctamente del sistema.` });
    } catch (error) { res.status(500).json({ error: "Error interno al intentar eliminar al usuario." }); }
});

app.get('/api/configuraciones', async (req, res) => {
    try {
        const query = `
            SELECT 
                TO_CHAR(fecha_registro, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_registro,
                TO_CHAR(fecha_subida, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_subida,
                TO_CHAR(fecha_resultados, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_resultados,
                TO_CHAR(fecha_cierre_votacion, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_cierre_votacion,
                gps_latitud, gps_longitud, gps_radio 
            FROM configuraciones WHERE id = 1
        `;
        const conf = await db.query(query);
        if(conf.rows.length === 0) return res.json({});
        res.json(conf.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error al obtener configuraciones" }); }
});

app.post('/api/configuraciones', async (req, res) => {
    const { fechaRegistro, fechaSubida, fechaResultados, fechaCierreVotacion, gpsLatitud, gpsLongitud, gpsRadio } = req.body;
    try {
        await db.query(
            `UPDATE configuraciones SET 
            fecha_registro=$1, fecha_subida=$2, fecha_resultados=$3, 
            fecha_cierre_votacion=$4, gps_latitud=$5, gps_longitud=$6, gps_radio=$7 
            WHERE id = 1`, 
            [fechaRegistro, fechaSubida, fechaResultados, fechaCierreVotacion, gpsLatitud, gpsLongitud, gpsRadio]
        );
        res.json({ mensaje: "Configuraciones globales actualizadas correctamente" });
    } catch (error) { res.status(500).json({ error: "Error al actualizar fechas" }); }
});

app.get('/api/instituciones', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM instituciones ORDER BY tipo DESC, nombre ASC');
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
            if (!hashBd) {
                if (password !== identificador) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
            } else {
                const passValida = await bcrypt.compare(password, hashBd);
                if (!passValida) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
            }
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
        if (result.rows[0].token === token) return res.json({ valida: true }); 
        res.json({ valida: false }); 
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

        if (!rolEncontrado) { return res.status(404).json({ error: "Usuario no encontrado." }); }

        res.json({ rol: rolEncontrado, datos: datosEncontrados });
    } catch (error) { res.status(500).json({ error: "Error interno del servidor." }); }
});

app.post('/api/restablecer_password_directo', async (req, res) => {
    const { ci, correo, nuevaPassword } = req.body;
    try {
        let tabla = null;

        let q = await db.query('SELECT * FROM administradores WHERE ci = $1 AND correo = $2', [ci, correo]);
        if (q.rows.length > 0) tabla = 'administradores';
        
        if (!tabla) {
            q = await db.query('SELECT * FROM expositores WHERE ci = $1 AND correo = $2', [ci, correo]);
            if (q.rows.length > 0) tabla = 'expositores';
        }

        if (!tabla) {
            q = await db.query('SELECT * FROM tribunales WHERE usuario_tribunal = $1 AND correo = $2', [ci, correo]);
            if (q.rows.length > 0) tabla = 'tribunales';
        }

        if (!tabla) {
            return res.status(404).json({ error: "⛔ Datos incorrectos. El Carnet/Usuario no coincide con ese correo en nuestros registros." });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(nuevaPassword, salt);

        if (tabla === 'administradores') await db.query('UPDATE administradores SET contrasena = $1 WHERE ci = $2', [hash, ci]);
        if (tabla === 'expositores') await db.query('UPDATE expositores SET contrasena = $1 WHERE ci = $2', [hash, ci]);
        if (tabla === 'tribunales') await db.query('UPDATE tribunales SET contrasena = $1 WHERE usuario_tribunal = $2', [hash, ci]);

        res.json({ mensaje: "Tu contraseña ha sido actualizada correctamente." });
    } catch (error) { res.status(500).json({ error: "Error interno al intentar cambiar la contraseña." }); }
});

app.post('/api/administradores', async (req, res) => {
    const { ci, nombre, correo, celular, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10); const hash = await bcrypt.hash(password, salt);
        await db.query('INSERT INTO administradores (ci, nombre_completo, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5)', [ci, nombre, correo, celular, hash]);
        res.status(201).json({ mensaje: "Administrador guardado exitosamente." });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: "El CI o el Correo ya pertenecen a un administrador." });
        res.status(500).json({ error: "Error interno al guardar administrador." });
    }
});

app.post('/api/expositores', async (req, res) => {
    const { ci, nombreCompleto, institucion, correo, celular, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10); const hash = await bcrypt.hash(password, salt);
        const query = `INSERT INTO expositores (ci, nombre_completo, institucion, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ci) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, institucion = EXCLUDED.institucion, correo = EXCLUDED.correo, celular = EXCLUDED.celular, contrasena = EXCLUDED.contrasena`;
        await db.query(query, [ci, nombreCompleto, institucion, correo, celular, hash]);
        res.status(201).json({ mensaje: "Expositor guardado exitosamente." });
    } catch (error) { res.status(500).json({ error: "Error al guardar expositor." }); }
});

app.post('/api/tribunales', async (req, res) => {
    const { usuario, nombre, especialidad, categoria, proyectosAsignados, correo, celular, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10); const hash = await bcrypt.hash(password, salt);
        const query = `INSERT INTO tribunales (usuario_tribunal, nombre_completo, especialidad, categoria_asignada, proyectos_asignados, correo, celular, contrasena) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        await db.query(query, [usuario, nombre, especialidad, categoria, proyectosAsignados, correo, celular, hash]);
        res.status(201).json({ mensaje: "✅ Tribunal guardado." });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: "Ese Usuario o Correo ya está registrado." });
        res.status(500).json({ error: "Error interno al guardar el tribunal." });
    }
});

app.post('/api/proyectos', async (req, res) => {
    const { ciPropietario, titulo, categoria, integrantes, ejeTematico, enlacePdfExistente, nuevoIntento } = req.body;
    try {
        const user = await db.query('SELECT ci FROM expositores WHERE ci = $1', [ciPropietario]);
        if (user.rows.length === 0) return res.status(404).json({ error: "Expositor no encontrado" });
        const ci = user.rows[0].ci;

        let enlacePdfFinal = enlacePdfExistente || null;
        let subcarpeta = 'otros';
        if (categoria.includes('estudiante')) subcarpeta = 'Estudiantes_Pregrado';
        else if (categoria.includes('docente')) subcarpeta = 'Docentes_Investigadores';
        else if (categoria.includes('emprendimiento')) subcarpeta = 'Emprendimientos';

        const dirDestino = path.join(__dirname, '../archivos_proyectos/', subcarpeta);
        if (!fs.existsSync(dirDestino)) { fs.mkdirSync(dirDestino, { recursive: true }); }
        
        const dirNoClasificados = path.join(__dirname, '../archivos_proyectos/Proyectos_NoClasificados');
        if (!fs.existsSync(dirNoClasificados)) { fs.mkdirSync(dirNoClasificados, { recursive: true }); }

        if (req.files && req.files.proyArchivo) {
            const archivo = req.files.proyArchivo;
            const nombreSeguro = `${ci}_${Date.now()}.pdf`;
            const rutaGuardado = path.join(dirDestino, nombreSeguro);
            await archivo.mv(rutaGuardado);
            enlacePdfFinal = `/archivos_proyectos/${subcarpeta}/${nombreSeguro}`;
        }

        if (nuevoIntento === 'true') {
            const checkAntiguo = await db.query("SELECT id, enlace_pdf FROM proyectos WHERE ci_propietario = $1 AND estado_evaluacion = 'Evaluado (No clasifica)'", [ci]);
            for (let row of checkAntiguo.rows) {
                if (row.enlace_pdf && !row.enlace_pdf.includes('Proyectos_NoClasificados')) {
                    const oldPath = path.join(__dirname, '../', row.enlace_pdf);
                    if (fs.existsSync(oldPath)) {
                        const fileName = path.basename(oldPath);
                        const newPath = path.join(dirNoClasificados, fileName);
                        fs.renameSync(oldPath, newPath);
                        const nuevoEnlaceDB = `/archivos_proyectos/Proyectos_NoClasificados/${fileName}`;
                        await db.query("UPDATE proyectos SET enlace_pdf = $1 WHERE id = $2", [nuevoEnlaceDB, row.id]);
                    }
                }
            }
            await db.query('INSERT INTO proyectos (ci_propietario, titulo, categoria, integrantes, eje_tematico, enlace_pdf) VALUES ($1, $2, $3, $4, $5, $6)', [ci, titulo, categoria, integrantes, ejeTematico, enlacePdfFinal]);
        } else {
            const check = await db.query('SELECT id, estado_evaluacion FROM proyectos WHERE ci_propietario = $1 ORDER BY id DESC LIMIT 1', [ci]);
            if (check.rows.length > 0) {
                const idProyecto = check.rows[0].id;
                const estadoActual = check.rows[0].estado_evaluacion;
                if (estadoActual === 'Evaluado (No clasifica)') {
                    await db.query('DELETE FROM evaluaciones_tribunal WHERE id_proyecto = $1', [idProyecto]);
                    await db.query(`UPDATE proyectos SET titulo=$1, categoria=$2, integrantes=$3, eje_tematico=$4, enlace_pdf=$5, fecha_ultima_edicion=CURRENT_TIMESTAMP, estado_evaluacion=NULL, nota_tribunal=NULL, nota_ponderada=NULL, observaciones_tribunal=NULL WHERE id=$6`, [titulo, categoria, integrantes, ejeTematico, enlacePdfFinal, idProyecto]);
                } else {
                    await db.query('UPDATE proyectos SET titulo=$1, categoria=$2, integrantes=$3, eje_tematico=$4, enlace_pdf=$5, fecha_ultima_edicion=CURRENT_TIMESTAMP WHERE id=$6', [titulo, categoria, integrantes, ejeTematico, enlacePdfFinal, idProyecto]);
                }
            } else {
                await db.query('INSERT INTO proyectos (ci_propietario, titulo, categoria, integrantes, eje_tematico, enlace_pdf) VALUES ($1, $2, $3, $4, $5, $6)', [ci, titulo, categoria, integrantes, ejeTematico, enlacePdfFinal]);
            }
        }
        res.status(201).json({ mensaje: "Proyecto guardado con éxito" });
    } catch (error) { res.status(500).json({ error: "Error al guardar proyecto y documento PDF" }); }
});

app.get('/api/proyectos/:ci', async (req, res) => {
    try {
        const proy = await db.query('SELECT * FROM proyectos WHERE ci_propietario = $1 ORDER BY id DESC LIMIT 1', [req.params.ci]);
        if (proy.rows.length === 0) return res.json(null);
        res.json(proy.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error al buscar proyecto" }); }
});

app.get('/api/proyectos_admin', async (req, res) => {
    try {
        const proyectos = await db.query('SELECT id, titulo, categoria, integrantes, enlace_pdf, estado_evaluacion FROM proyectos ORDER BY id DESC');
        res.json(proyectos.rows);
    } catch (error) { res.status(500).json({ error: "Error al cargar proyectos" }); }
});

app.get('/api/proyectos_qr/:id', async (req, res) => {
    try {
        const proy = await db.query('SELECT * FROM proyectos WHERE id = $1', [req.params.id]);
        if (proy.rows.length === 0) return res.status(404).json({ error: "Proyecto no encontrado" });
        res.json(proy.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error del servidor" }); }
});

app.delete('/api/proyectos_admin/:id', async (req, res) => {
    try {
        const idProyecto = req.params.id;
        await db.query('DELETE FROM votos_publico WHERE id_proyecto = $1', [idProyecto]);
        await db.query('DELETE FROM evaluaciones_tribunal WHERE id_proyecto = $1', [idProyecto]);
        await db.query('DELETE FROM proyectos WHERE id = $1', [idProyecto]);
        res.json({ mensaje: "Proyecto eliminado exitosamente del sistema." });
    } catch (error) { res.status(500).json({ error: "Error interno al intentar eliminar el proyecto." }); }
});

app.post('/api/visitantes', async (req, res) => {
    const { ci, nombreCompleto, institucion, celular } = req.body;
    try {
        const checkVisitante = await db.query('SELECT * FROM visitantes WHERE ci = $1', [ci]);
        if (checkVisitante.rows.length > 0) return res.status(400).json({ error: "C.I. ya habilitado." });
        let nombreFinal = nombreCompleto; let institucionFinal = institucion;
        const checkExpositor = await db.query('SELECT * FROM expositores WHERE ci = $1', [ci]);
        if (checkExpositor.rows.length > 0) { nombreFinal = checkExpositor.rows[0].nombre_completo; institucionFinal = checkExpositor.rows[0].institucion; }
        const insertQuery = `INSERT INTO visitantes (ci, nombre_completo, institucion, celular) VALUES ($1, $2, $3, $4) RETURNING *`;
        const nuevoVisitante = await db.query(insertQuery, [ci, nombreFinal, institucionFinal, celular]);
        res.status(201).json({ mensaje: "✅ Visitante habilitado correctamente", visitante: nuevoVisitante.rows[0] });
    } catch (error) { res.status(500).json({ error: "Error al intentar habilitar." }); }
});

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

app.get('/api/verificar_voto_duplicado/:ci/:idProy', async (req, res) => {
    try {
        const { ci, idProy } = req.params;
        const dup = await db.query('SELECT id FROM votos_publico WHERE ci_visitante = $1 AND id_proyecto = $2', [ci, idProy]);
        if (dup.rows.length > 0) return res.json({ yaVoto: true });
        res.json({ yaVoto: false });
    } catch (error) { res.status(500).json({ error: "Error interno al verificar duplicidad." }); }
});

// 🔥 VOTACIÓN: AUTO-REGISTRO SILENCIOSO DE INSTITUCIÓN Y HUELLA DIGITAL 🔥
app.post('/api/votar', async (req, res) => {
    const { idProyecto, ci, nota, lat, lon, institucionVisitante } = req.body;
    try {
        const checkTime = await db.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz' > fecha_cierre_votacion) as votacion_cerrada, gps_latitud, gps_longitud, gps_radio FROM configuraciones WHERE id = 1`);
        const conf = checkTime.rows[0];

        if (conf.votacion_cerrada) {
            return res.status(400).json({ error: "⏳ El periodo de votación del público ha finalizado. Ya no se aceptan nuevos votos." });
        }

        if (lat === null || lat === undefined || lon === null || lon === undefined) {
            return res.status(400).json({ error: "⛔ Bloqueo de Seguridad: No se detectaron tus coordenadas GPS." });
        }

        const feriaLat = parseFloat(conf.gps_latitud);
        const feriaLon = parseFloat(conf.gps_longitud);
        const radioPermitido = parseInt(conf.gps_radio, 10);
        const userLat = parseFloat(lat);
        const userLon = parseFloat(lon);

        if (isNaN(feriaLat) || isNaN(feriaLon) || isNaN(radioPermitido) || isNaN(userLat) || isNaN(userLon)) {
            return res.status(400).json({ error: "⛔ Error del Sensor: Sus coordenadas GPS no son válidas o están manipuladas." });
        }

        const distanciaActual = calcularDistanciaMetros(feriaLat, feriaLon, userLat, userLon);
        if (isNaN(distanciaActual) || distanciaActual > radioPermitido) {
            return res.status(400).json({ error: `⛔ ALERTA DE FRAUDE:\nEstás a ${isNaN(distanciaActual) ? 'una distancia desconocida' : distanciaActual.toFixed(0)} metros de distancia.\nSolo se permite votar dentro de un radio de ${radioPermitido} metros del recinto habilitado.` });
        }

        const proyCheck = await db.query('SELECT ci_propietario, estado_evaluacion FROM proyectos WHERE id = $1', [idProyecto]);
        if (proyCheck.rows.length > 0 && proyCheck.rows[0].ci_propietario === ci) {
            return res.status(400).json({ error: "⛔ Fraude Detectado: No puedes calificar tu propio proyecto." });
        }
        /*
        if (proyCheck.rows.length > 0 && proyCheck.rows[0].estado_evaluacion !== 'Pre-seleccionado') {
            return res.status(400).json({ error: "⛔ Operación Rechazada: Este proyecto no superó la pre-selección y no está habilitado para el público." });
        }
        */
        // Si es un dispositivo nuevo, lo guardamos en la base de datos con el colegio que seleccionó
        if (ci.startsWith('DEV-')) {
            const checkVis = await db.query('SELECT ci FROM visitantes WHERE ci = $1', [ci]);
            if (checkVis.rows.length === 0) {
                const institucionFinal = institucionVisitante || 'Visitante Anónimo (Dispositivo)';
                await db.query(`INSERT INTO visitantes (ci, nombre_completo, institucion, celular) VALUES ($1, 'Visitante (Móvil)', $2, 'S/N')`, [ci, institucionFinal]);
            }
        }

        const dup = await db.query('SELECT id FROM votos_publico WHERE ci_visitante = $1 AND id_proyecto = $2', [ci, idProyecto]);
        if (dup.rows.length > 0) return res.status(400).json({ error: "Ya calificaste este proyecto anteriormente." });
        
        const notaValidada = parseInt(nota, 10);
        await db.query('INSERT INTO votos_publico (id_proyecto, ci_visitante, nota, latitud, longitud) VALUES ($1, $2, $3, $4, $5)', [idProyecto, ci, notaValidada, userLat, userLon]);
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
        res.json({ mensaje: "Evaluación del tribunal eliminada y proyecto regresado a estado Pendiente." });
    } catch (error) { res.status(500).json({ error: "Error al eliminar la evaluación del tribunal." }); }
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

        const check = await db.query('SELECT id FROM evaluaciones_tribunal WHERE id_proyecto = $1 AND usuario_tribunal = $2', [idProyecto, usuarioTribunal]);
        if (check.rows.length > 0) return res.status(400).json({ error: "⛔ Ya registraste una calificación." });

        await db.query('INSERT INTO evaluaciones_tribunal (id_proyecto, usuario_tribunal, nota, observaciones) VALUES ($1, $2, $3, $4)', [idProyecto, usuarioTribunal, notaTribunal, observaciones]);

        const notaPonderada = notaTribunal * 0.80;
        let estado = notaPonderada >= 51 ? 'Pre-seleccionado' : 'Evaluado (No clasifica)';

        await db.query('UPDATE proyectos SET nota_tribunal = $1, nota_ponderada = $2, observaciones_tribunal = $3, estado_evaluacion = $4 WHERE id = $5', [notaTribunal, notaPonderada, observaciones, estado, idProyecto]);

        const proyData = await db.query('SELECT p.titulo, e.correo, e.nombre_completo FROM proyectos p JOIN expositores e ON p.ci_propietario = e.ci WHERE p.id = $1', [idProyecto]);

        res.status(201).json({ 
            mensaje: "✅ Evaluación guardada", estado: estado, notaPonderada: notaPonderada,
            correoEstudiante: proyData.rows.length > 0 ? proyData.rows[0].correo : "",
            nombreExpositor: proyData.rows.length > 0 ? proyData.rows[0].nombre_completo : "",
            tituloProyecto: proyData.rows.length > 0 ? proyData.rows[0].titulo : "Proyecto"
        });
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
        const resultados_ocultos = checkTime.rows[0].resultados_ocultos;
        
        let esAdmin = false;
        if (ci && ci !== "publico") {
            const adminCheck = await db.query('SELECT ci FROM administradores WHERE ci = $1', [ci]);
            if (adminCheck.rows.length > 0) esAdmin = true;
        }

        if (resultados_ocultos && !esAdmin) {
            return res.status(403).json({ error: "⛔ Bloqueo Backend: Los resultados aún no son públicos." });
        }

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