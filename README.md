# 🍌 Banana World v0.3 By carlosfr.es

Una aplicación web interactiva para generar y manipular arte isométrico usando IA avanzada. Crea mundos únicos con múltiples estilos artísticos, modelos 3D interactivos y videos animados con inteligencia artificial.

## ✨ Características Principales

### 🎮 Modos de Juego
- **Pixel Art** 🎮: Genera sprites 3D en estilo pixel art isométrico clásico
- **Constructor** 🏗️: Crea edificios y estructuras arquitectónicas 2D isométricas
- **Anime HD** 🎌: Arte anime isométrico ultra definido con colores vibrantes
- **Sticker 3D** 🏷️: Pegatinas 3D profesionales para logotipos y diseño
- **Escena Completa** 🖼️: Recrea imágenes completas en pixel art isométrico

### 🎨 Generación de Assets
- **Desde Texto**: Describe lo que quieres crear y la IA lo genera
- **Desde Imagen**: Sube una foto y conviértela al estilo seleccionado
- **Remix**: Modifica assets existentes con nuevas instrucciones

### 🔧 Herramientas de Manipulación
- **Escalado**: Ajusta el tamaño de los assets (1x, 1.2x, 1.5x, 2x)
- **Volteo Horizontal**: Refleja los assets horizontalmente
- **Duplicación**: Crea copias de tus assets favoritos
- **Descarga Individual**: Exporta assets como PNG transparentes
- **Información Detallada**: Ve metadatos de generación y tiempos

### 🎬 Generación 3D y Video
- **Modelos 3D**: Convierte assets 2D a modelos 3D interactivos
  - **Hunyuan Normal** 🏆: Modelo completo con GLB, PBR y MESH (alta calidad)
  - **Hunyuan Turbo** ⚡: Modelo rápido, solo GLB (velocidad optimizada)
  - **Trellis** 🔬: Modelo avanzado de Microsoft (muy alta calidad)
- **Visualización 3D**: Visor interactivo con rotación, zoom y controles
- **Descarga 3D**: Múltiples formatos (GLB, PBR, MESH) según el modelo
- **Videos Animados**: Genera videos MP4 desde imágenes con prompts de movimiento
- **Reproductor Integrado**: Visualiza videos con controles completos
- **Descarga de Video**: Exporta videos en formato MP4

### 🎯 Interacción Intuitiva
- **Arrastrar y Soltar**: Mueve assets libremente por el canvas
- **Selección Visual**: Círculo azul indica el asset seleccionado
- **Menú Contextual**: Herramientas aparecen al seleccionar un asset
- **Grid Isométrico**: Guías visuales para alineación perfecta

### 🔐 Sistema de Acceso
- Pantalla de login con contraseña personalizable
- Protección de acceso configurable via variables de entorno

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn
- API Key de Google Gemini
- API Key de Fal AI (para funcionalidades 3D y video)

### Instalación Local

1. **Clona el repositorio**
```bash
git clone <repository-url>
cd banana-world-v0.1
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura variables de entorno**
Crea un archivo `.env.local` en la raíz del proyecto:
```env
GEMINI_API_KEY=tu_api_key_de_gemini
VITE_FAL_API_KEY=tu_api_key_de_fal_ai
VITE_APP_PASSWORD=tu_contraseña_personalizada
```

4. **Inicia el servidor de desarrollo**
```bash
npm run dev
```

5. **Abre tu navegador**
Ve a `http://localhost:5173`

### Despliegue en Vercel

1. **Conecta tu repositorio** a Vercel
2. **Configura las variables de entorno** en Vercel:
   - `GEMINI_API_KEY`: Tu API key de Google Gemini
   - `VITE_FAL_API_KEY`: Tu API key de Fal AI
   - `VITE_APP_PASSWORD`: Contraseña de acceso a la aplicación
3. **Despliega** automáticamente

## 🎯 Cómo Usar

### Acceso Inicial
1. Ingresa la contraseña configurada en la pantalla de login
2. Accede al canvas principal de Banana World

### Generación de Assets

#### Modo Pixel Art 🎮
1. Selecciona "Pixel Art" en el selector de modo
2. **Desde texto**: Escribe una descripción (ej: "dragon", "castle", "tree")
3. **Desde imagen**: Haz clic en "Upload Image" y selecciona una foto
4. Espera a que la IA genere tu sprite 3D isométrico

#### Modo Constructor 🏗️
1. Selecciona "Constructor" en el selector de modo
2. **Desde texto**: Describe un edificio (ej: "casa moderna", "torre medieval")
3. **Desde imagen**: Sube una foto de un edificio real
4. La IA creará una representación isométrica 2D arquitectónica

#### Modo Anime HD 🎌
1. Selecciona "Anime HD" en el selector de modo
2. **Desde texto**: Describe personajes o escenas anime (ej: "guerrero samurai", "mago con bastón")
3. **Desde imagen**: Convierte fotos al estilo anime isométrico
4. Obtén arte anime ultra definido con colores vibrantes

#### Modo Sticker 3D 🏷️
1. Selecciona "Sticker 3D" en el selector de modo
2. **Desde texto**: Describe elementos para logos (ej: "logo de empresa", "mascota")
3. **Desde imagen**: Convierte imágenes a stickers profesionales
4. Perfecto para diseño de logotipos y branding

#### Modo Escena Completa 🖼️
1. Selecciona "Escena Completa" en el selector de modo
2. **Desde imagen**: Sube cualquier imagen compleja
3. La IA recreará toda la escena en pixel art isométrico
4. Mantiene todos los elementos y detalles de la imagen original

### Manipulación de Assets

1. **Seleccionar**: Haz clic en cualquier asset para seleccionarlo
2. **Mover**: Arrastra el asset seleccionado a una nueva posición
3. **Escalar**: Usa el slider "Tamaño" para ajustar entre 1x-2x
4. **Voltear**: Botón de volteo horizontal en el menú de herramientas
5. **Duplicar**: Crea copias con el botón de duplicación
6. **Remix**: Modifica el asset con nuevas instrucciones
7. **Descargar**: Exporta como PNG transparente
8. **Ver Info**: Consulta metadatos de generación

### Funcionalidades 3D

#### Conversión a Modelos 3D
1. **Selecciona un asset** generado en cualquier modo
2. **Haz clic en el botón 3D** (🎮) en la barra de herramientas
3. **Elige el modelo 3D** según tus necesidades:
   - **Hunyuan Normal** 🏆: Máxima calidad, múltiples formatos (lento)
   - **Hunyuan Turbo** ⚡: Velocidad optimizada, formato GLB (rápido)
   - **Trellis** 🔬: Tecnología Microsoft, muy alta calidad (medio)
4. **Espera la conversión** (tiempo varía según el modelo)
5. **Visualiza el modelo 3D** en el visor interactivo

#### Visor 3D Interactivo
- **Rotación**: Arrastra para rotar el modelo en cualquier dirección
- **Zoom**: Usa la rueda del mouse para acercar/alejar
- **Controles**: Navegación intuitiva con mouse
- **Descarga**: Botones para diferentes formatos según el modelo usado

### Generación de Videos

#### Crear Videos Animados
1. **Selecciona un asset** generado
2. **Haz clic en el botón Video** (🎬) en la barra de herramientas
3. **Describe el movimiento** deseado en el prompt:
   - "Un gato caminando lentamente en el jardín"
   - "Una persona saludando con la mano"
   - "Un objeto rotando suavemente"
   - "Hojas cayendo del árbol"
4. **Haz clic en "🎬 Generar Video"**
5. **Espera la generación** (puede tomar varios minutos)
6. **Visualiza el video** en el reproductor integrado

#### Reproductor de Video
- **Controles completos**: Play, pausa, volumen, tiempo
- **Autoplay y loop**: Reproducción automática y continua
- **Información del prompt**: Ve qué descripción se usó
- **Descarga MP4**: Exporta el video generado

### Gestión del Canvas

- **Reset**: Limpia todo el canvas (botón de reset)
- **Descarga Completa**: Exporta todo el canvas como imagen
- **Grid Isométrico**: Guías visuales automáticas para alineación

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **IA Generativa**: 
  - Google Gemini API para generación de imágenes
  - Fal AI para modelos 3D y generación de video
- **Modelos 3D**: 
  - Hunyuan 3D (Normal y Turbo)
  - Microsoft Trellis
- **Video**: Fal AI Decart Lucy-5B para image-to-video
- **Visualización 3D**: Model-viewer web component
- **Audio**: Tone.js para feedback sonoro
- **Analytics**: Vercel Analytics
- **Despliegue**: Vercel

## 📁 Estructura del Proyecto

```
banana-world-v0.1/
├── src/
│   ├── App.tsx              # Componente principal (copia)
│   ├── public/
│   │   ├── favi.png         # Favicon PNG
│   │   └── favi.webp        # Favicon WebP
│   └── services/
│       └── geminiService.ts  # Integración con Gemini AI
├── App.tsx                   # Componente principal
├── index.tsx                 # Punto de entrada
├── index.html               # Template HTML
├── services/
│   ├── geminiService.ts     # Servicio de IA para imágenes
│   └── falService.ts        # Servicio de Fal AI (3D y video)
├── package.json             # Dependencias
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración TypeScript
├── FAL.MD                  # Documentación de Fal AI
└── .env.local              # Variables de entorno (local)
```

## 🎨 Características Técnicas

### Procesamiento de Imágenes
- **Transparencia Automática**: Remoción de fondos blancos
- **Optimización de Tamaño**: Redimensionado inteligente
- **Detección de Contenido**: Identificación de áreas relevantes
- **Cache Inteligente**: Optimización de memoria para imágenes

### Interfaz de Usuario
- **Responsive Design**: Adaptable a diferentes tamaños de pantalla
- **Feedback Visual**: Animaciones y estados de carga
- **Accesibilidad**: Labels y navegación por teclado
- **Tema Consistente**: Diseño minimalista en blanco y negro

### Rendimiento
- **Canvas Optimizado**: Renderizado eficiente con requestAnimationFrame
- **Gestión de Memoria**: Limpieza automática de recursos
- **Lazy Loading**: Carga bajo demanda de componentes
- **Debouncing**: Optimización de eventos de usuario

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Requeridas
GEMINI_API_KEY=your_gemini_api_key_here
VITE_FAL_API_KEY=your_fal_api_key_here
VITE_APP_PASSWORD=your_access_password

# Opcionales
VITE_DEBUG_MODE=false
VITE_MAX_IMAGES=50
```

### Personalización

- **Prompts**: Modifica las constantes de prompts en `App.tsx`
- **Estilos**: Ajusta colores y diseño en las clases de Tailwind
- **Escalas**: Modifica `SCALE_OPTIONS` para diferentes tamaños
- **Contraseña**: Cambia `VITE_APP_PASSWORD` en variables de entorno

## 🐛 Solución de Problemas

### Problemas Comunes

**Error de API Key**
- Verifica que `GEMINI_API_KEY` esté configurada correctamente
- Asegúrate de que `VITE_FAL_API_KEY` esté configurada para funciones 3D/video
- Confirma que las API keys tengan permisos y créditos suficientes

**Problemas de Carga**
- Revisa la conexión a internet
- Verifica que las variables de entorno estén configuradas
- Comprueba la consola del navegador para errores

**Rendimiento Lento**
- Reduce el número de assets en el canvas
- Usa escalas menores para assets grandes
- Cierra otras pestañas del navegador

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si encuentras algún problema o tienes preguntas:

- Abre un issue en GitHub
- Revisa la documentación
- Consulta los logs de la consola del navegador

---

**¡Disfruta creando mundos únicos con Banana World! 🍌✨**
