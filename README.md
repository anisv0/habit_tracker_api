# Habit Tracker API

API REST para crear hábitos, marcar los días cumplidos y consultar estadísticas de seguimiento.

Este repositorio contiene únicamente el backend. La interfaz web vive en un repositorio aparte: [habit_tracker_web](https://github.com/anisv0/habit_tracker_web).

## Tecnologías

| Herramienta | Uso |
| --- | --- |
| NestJS | Framework del servidor |
| Prisma 6 | ORM y acceso a la base de datos |
| MongoDB | Base de datos (requiere replica set) |
| JWT | Autenticación por token |
| bcryptjs | Cifrado de contraseñas |
| class-validator | Validación de los datos que entran |

## Requisitos

- Node.js 20 o superior
- pnpm
- Docker, para levantar MongoDB en local

## Instalación

```bash
pnpm install
```

## Variables de entorno

Crear un archivo `.env` en la raíz con estas dos variables:

```
DATABASE_URL=
JWT_SECRET=
```

- `DATABASE_URL`: cadena de conexión de MongoDB, incluyendo el nombre de la base.
- `JWT_SECRET`: texto secreto con el que se firman los tokens.

Opcionalmente, `WEB_URL` define la dirección del frontend autorizada por CORS. Si no se indica, se usa `http://localhost:3000`.

El archivo `.env` está excluido del repositorio. En `.env.example` están los nombres de las variables sin valores.

## Base de datos

Prisma con MongoDB necesita que el servidor esté configurado como replica set. Para levantarlo en local:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec -it mongo mongosh --eval "rs.initiate()"
```

Con eso, la conexión queda así:

```
DATABASE_URL=mongodb://localhost:27017/habittracker?replicaSet=rs0&directConnection=true
```

Luego generar el cliente y crear las colecciones:

```bash
pnpm prisma generate
pnpm prisma db push
```

Estos dos comandos se vuelven a ejecutar cada vez que se modifica `prisma/schema.prisma`.

## Ejecución

```bash
pnpm start:dev
```

El servidor queda en `http://localhost:3001`. Todas las rutas usan el prefijo `/api`.

## Modelos

| Modelo | Descripción |
| --- | --- |
| `User` | Cuenta de la persona: nombre, correo y contraseña cifrada |
| `Habit` | Hábito creado por un usuario: nombre, descripción, categoría y color |
| `HabitRecord` | Un día marcado como cumplido para un hábito |

Un usuario tiene muchos hábitos y un hábito tiene muchos registros. Al borrar un usuario se borran sus hábitos, y al borrar un hábito se borran sus registros.

## Endpoints

| Método | Ruta | Descripción | Token |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Crear cuenta | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Datos del usuario de la sesión | Sí |
| GET | `/api/habits` | Listar los hábitos del usuario | Sí |
| POST | `/api/habits` | Crear un hábito | Sí |
| GET | `/api/habits/:id` | Ver un hábito | Sí |
| PATCH | `/api/habits/:id` | Editar un hábito | Sí |
| DELETE | `/api/habits/:id` | Eliminar un hábito | Sí |
| POST | `/api/habits/:id/records` | Marcar un día como cumplido | Sí |
| GET | `/api/habits/:id/records` | Historial de un hábito | Sí |
| DELETE | `/api/habits/:id/records/:fecha` | Desmarcar un día | Sí |
| GET | `/api/stats/summary` | Resumen para el panel principal | Sí |

Las rutas marcadas con token requieren el encabezado `Authorization: Bearer <token>`. El token se obtiene al registrarse o iniciar sesión y vence a los 7 días.

## Arquitectura

El sistema está dividido en tres partes que se comunican por HTTP:

```
Navegador
    │
    ▼
Frontend  ·  Next.js + React          habit_tracker_web
    │        pantallas y formularios
    │
    │  peticiones HTTP con el token en el encabezado
    ▼
Backend  ·  NestJS                    este repositorio
    │
    │   ┌─ ValidationPipe    revisa que los datos entren bien
    │   ├─ JwtAuthGuard      revisa el token y saca el userId
    │   ├─ Controlador       define la ruta y recibe la petición
    │   ├─ Servicio          aplica la lógica del negocio
    │   └─ ErroresFilter     traduce cualquier fallo a un mensaje claro
    │
    ▼
Prisma  ·  ORM
    │        traduce el código TypeScript a consultas
    ▼
MongoDB  ·  base de datos
```

### Recorrido de una petición

1. El frontend envía la petición con el encabezado `Authorization: Bearer <token>`.
2. El `JwtAuthGuard` verifica la firma del token y coloca el `userId` en la petición.
3. El `ValidationPipe` revisa el cuerpo contra el DTO correspondiente y descarta campos no declarados.
4. El controlador recibe el `userId` mediante el decorador `UsuarioActual` y llama al servicio.
5. El servicio consulta la base filtrando siempre por ese `userId`, de modo que un usuario solo alcanza sus propios datos.
6. Si algo falla en cualquier punto, el `ErroresFilter` convierte el error en una respuesta con código y mensaje entendible.

### Estructura del código

```
src/
├── auth/       registro, inicio de sesión y verificación del token
├── habits/     creación, consulta, edición y borrado de hábitos
├── records/    marcar y desmarcar días
├── stats/      cálculo de rachas y porcentajes
├── prisma/     conexión con la base de datos
├── common/     filtro global de errores
└── main.ts     arranque del servidor
```

El código está organizado por dominio: cada carpeta agrupa todo lo de un mismo tema del negocio, en lugar de separar por tipo de archivo. Dentro de cada dominio la organización es siempre la misma: el controlador recibe la petición y define la ruta, el servicio contiene la lógica, el módulo conecta ambos y la carpeta `dto` define qué datos se aceptan y con qué reglas.

### Manejo de errores

`common/errores.filter.ts` captura toda excepción que llegue al servidor y devuelve siempre la misma forma de respuesta:

```json
{
  "statusCode": 404,
  "message": "Habito no encontrado",
  "path": "/api/habits/abc123",
  "timestamp": "2026-09-21T15:04:05.000Z"
}
```

Traduce además los errores de Prisma a mensajes comprensibles: un registro duplicado devuelve 409, un identificador con formato inválido devuelve 400 y una base de datos caída devuelve 503. Los errores no previstos se registran en consola con su traza y responden 500 sin exponer detalles internos.

## Pruebas de la API

En la carpeta `postman` está la colección `HabitTracker.postman_collection.json`, lista para importar en Postman. Incluye el flujo completo: registro, login, creación de un hábito, marcado de un día y consulta del resumen.
