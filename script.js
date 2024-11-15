document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');
    const recommendationsDiv = document.getElementById('recommendations');
    const passwordCard = document.getElementById('password-card');
    const passwordInput = document.getElementById('password-input');
    const passwordButton = document.getElementById('password-button');

    let vetoedProducts = []; // Array de IDs de productos vetados
    let password = ''; // Variable para almacenar la contraseña
    let conversationHistory = []; // Array para mantener el historial de la conversación
    let selectedMode = 'cervantes'; // Modo por defecto
    let isFirstRealInteraction = true; // Variable para rastrear la primera interacción real

    // Deshabilitar el chat hasta que se ingrese la contraseña
    sendButton.disabled = true;
    messageInput.disabled = true;

    passwordButton.addEventListener('click', enterPassword);
    passwordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            enterPassword();
        }
    });

    // Obtener los botones de modo
    const modeButtons = document.querySelectorAll('.mode-button');

    // Añadir event listeners a los botones de modo
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remover la clase 'active' de todos los botones
            modeButtons.forEach(btn => btn.classList.remove('active'));
            // Añadir la clase 'active' al botón clicado
            button.classList.add('active');
            // Actualizar el modo seleccionado
            selectedMode = button.getAttribute('data-mode');
            console.log('Modo seleccionado:', selectedMode);
        });
    });

    function enterPassword() {
        const enteredPassword = passwordInput.value.trim();
        if (enteredPassword !== '') {
            // Almacenar la contraseña
            password = enteredPassword;

            // Realizar la solicitud inicial a la API para verificar la contraseña
            initializeConversation();
        } else {
            alert('Por favor, ingrese una contraseña válida.');
        }
    }

    function initializeConversation() {
        fetch('https://sorolla-definitivo-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "",
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                // La respuesta no es OK, puede ser un error de red o de servidor
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            if (data.error && data.error === "Contraseña incorrecta") {
                // Contraseña incorrecta
                alert('Contraseña incorrecta. Por favor, inténtalo de nuevo.');
                // Limpiar el campo de contraseña
                passwordInput.value = '';
                // Volver a mostrar la tarjeta de contraseña si estaba oculta
                passwordCard.style.display = 'flex';
            } else {
                // Contraseña correcta, iniciar el chat
                console.log('Inicialización exitosa:', data);

                // Ocultar la tarjeta de contraseña
                passwordCard.style.display = 'none';

                // Habilitar el chat
                sendButton.disabled = false;
                messageInput.disabled = false;

                // Cargar conversación de ejemplo
                loadExampleConversation();

                // Cargar productos de ejemplo
                loadExampleProducts();
            }
        })
        .catch(error => {
            console.error('Error en la inicialización:', error);
            alert('Error al conectarse con el servidor. Por favor, inténtalo de nuevo más tarde.');
        });
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            if (isFirstRealInteraction) {
                // Limpiar el chat y las recomendaciones
                chatWindow.innerHTML = '';
                recommendationsDiv.innerHTML = '';
                conversationHistory = [];
                isFirstRealInteraction = false;
            }

            // Mostrar mensaje del farmacéutico
            const pharmacistMessage = document.createElement('div');
            pharmacistMessage.classList.add('message', 'pharmacist');
            pharmacistMessage.innerHTML = `<span class="role">Farmacéutico</span><p>${messageText}</p>`;
            chatWindow.appendChild(pharmacistMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            // Añadir el mensaje al historial de conversación
            conversationHistory.push({ role: 'user', content: messageText });

            // Limpiar el input
            messageInput.value = '';

            // Mostrar animación de "pensando"
            showThinkingAnimation();

            // Llamar a la función para obtener la respuesta del asistente
            getAssistantResponse();
        }
    }

    function showThinkingAnimation() {
        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message', 'assistant', 'thinking');
        thinkingMessage.innerHTML = `<span class="role">Asistente</span><p>Pensando...</p>`;
        chatWindow.appendChild(thinkingMessage);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeThinkingAnimation() {
        const thinkingMessages = document.querySelectorAll('.thinking');
        thinkingMessages.forEach(msg => msg.remove());
    }

    function buildMessageFromHistory() {
        return conversationHistory.map(entry => entry.content).join('\n');
    }

    function getAssistantResponse() {
        const fullMessage = buildMessageFromHistory();

        fetch('https://sorolla-definitivo-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: fullMessage,
                veto: vetoedProducts,
                password: password,
                modo: selectedMode // Usar el modo seleccionado
            })
        })
        .then(response => {
            if (!response.ok) {
                // La respuesta no es OK, puede ser un error de red o de servidor
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            // Remover animación de "pensando"
            removeThinkingAnimation();

            if (data.error && data.error === "Contraseña incorrecta") {
                // Contraseña incorrecta durante la sesión
                alert('Contraseña incorrecta. Por favor, vuelve a iniciar sesión.');
                // Deshabilitar el chat
                sendButton.disabled = true;
                messageInput.disabled = true;
                // Mostrar la tarjeta de contraseña
                passwordCard.style.display = 'flex';
                // Limpiar el historial de conversación
                conversationHistory = [];
                // Limpiar el chat
                chatWindow.innerHTML = '';
                // Limpiar las recomendaciones
                recommendationsDiv.innerHTML = '';
            } else {
                // Mostrar respuesta del asistente
                const assistantMessage = document.createElement('div');
                assistantMessage.classList.add('message', 'assistant');
                assistantMessage.innerHTML = `<span class="role">Asistente</span><p>${data.Respuesta}</p>`;
                chatWindow.appendChild(assistantMessage);
                chatWindow.scrollTop = chatWindow.scrollHeight;

                // Añadir la respuesta al historial de conversación
                conversationHistory.push({ role: 'assistant', content: data.Respuesta });

                // Actualizar recomendaciones
                updateRecommendations(data.Recomendaciones);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            removeThinkingAnimation();

            // Mostrar mensaje de error en el chat
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('message', 'assistant');
            errorMessage.innerHTML = `<span class="role">Asistente</span><p>Ocurrió un error al obtener la respuesta. Por favor, inténtalo de nuevo.</p>`;
            chatWindow.appendChild(errorMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        });
    }

    function extractImageFilename(imageString) {
        // imageString es algo como "['204091.jpg']"
        // Remover corchetes y comillas simples
        let cleanedString = imageString.replace(/[\[\]']/g, '');
        // Separar por comas en caso de múltiples imágenes
        let filenames = cleanedString.split(',');

        // Retornar el primer nombre de archivo
        return filenames[0].trim();
    }

    function updateRecommendations(productos) {
        recommendationsDiv.innerHTML = ''; // Limpiar recomendaciones anteriores

        const baseImageUrl = ''; // Ajusta esta ruta según la ubicación de tus imágenes

        // Ordenar productos por Similitud de mayor a menor
        productos.sort((a, b) => b.Similitud - a.Similitud);

        productos.forEach(producto => {
            if (!vetoedProducts.includes(producto.id)) {
                const productCard = document.createElement('div');
                productCard.classList.add('product-card');

                const img = document.createElement('img');
                let imageFilename = '';

                if (producto.Imagenes && producto.Imagenes.length > 0) {
                    imageFilename = extractImageFilename(producto.Imagenes[0]);
                    console.log(imageFilename);
                    img.src = baseImageUrl + imageFilename;
                } else {
                    img.src = 'NoFoto.png'; // Imagen por defecto
                }

                img.alt = producto.Nombre;

                const productInfo = document.createElement('div');
                productInfo.classList.add('product-info');

                const title = document.createElement('h3');
                const similitudPercentage = (producto.Similitud * 100).toFixed(0) + '%';
                title.textContent = `${producto.Nombre} (${similitudPercentage})`;

                const description = document.createElement('p');
                description.textContent = producto.Descripcion || '';

                productInfo.appendChild(title);
                productInfo.appendChild(description);

                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-button');
                removeButton.textContent = 'Producto no relacionado';
                removeButton.addEventListener('click', () => {
                    productCard.remove();
                    if (!vetoedProducts.includes(producto.id)) {
                        vetoedProducts.push(producto.id); // Añadir el ID del producto vetado
                        // Imprimir el ID vetado en la consola
                        console.log('Producto vetado:', producto.id);
                    }
                });

                productCard.appendChild(img);
                productCard.appendChild(productInfo);
                productCard.appendChild(removeButton);

                recommendationsDiv.appendChild(productCard);
            }
        });
    }

    function loadExampleConversation() {
        // Mensaje de ejemplo del farmacéutico
        const pharmacistMessage = document.createElement('div');
        pharmacistMessage.classList.add('message', 'pharmacist');
        pharmacistMessage.innerHTML = `<span class="role">Farmacéutico</span><p>Hola, necesito ayuda con un resfriado.</p>`;
        chatWindow.appendChild(pharmacistMessage);

        // Mensaje de ejemplo del asistente
        const assistantMessage = document.createElement('div');
        assistantMessage.classList.add('message', 'assistant');
        assistantMessage.innerHTML = `<span class="role">Asistente</span><p>Claro, puedo recomendarle algunos productos.</p>`;
        chatWindow.appendChild(assistantMessage);

        // Añadir mensajes al historial de conversación
        conversationHistory.push({ role: 'user', content: 'Hola, necesito ayuda con un resfriado.' });
        conversationHistory.push({ role: 'assistant', content: 'Claro, puedo recomendarle algunos productos.' });

        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function loadExampleProducts() {
        const exampleProducts = [
            {
                id: 'producto1',
                Nombre: 'Producto de Ejemplo 1',
                Descripcion: 'Descripción del producto 1.',
                Imagenes: ['foto1.jpg'],
                Similitud: 0.9
            },
            {
                id: 'producto2',
                Nombre: 'Producto de Ejemplo 2',
                Descripcion: 'Descripción del producto 2.',
                Imagenes: ['foto2.jpg'],
                Similitud: 0.7
            },
            {
                id: 'producto3',
                Nombre: 'Producto de Ejemplo 3',
                Descripcion: 'Descripción del producto 3.',
                Imagenes: ['foto3.webp'],
                Similitud: 0.4
            }
        ];

        updateRecommendations(exampleProducts);
    }
});
