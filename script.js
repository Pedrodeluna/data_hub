document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');
    const recommendationsDiv = document.getElementById('recommendations');
    const passwordCard = document.getElementById('password-card');
    const passwordInput = document.getElementById('password-input');
    const passwordButton = document.getElementById('password-button');
    const resetButton = document.getElementById('reset-button');

    let vetoedProducts = []; // Array de IDs de productos vetados
    let password = ''; // Variable para almacenar la contraseña
    let conversationHistory = []; // Array para mantener el historial de la conversación como strings
    let selectedMode = 'auto'; // Modo por defecto
    let isFirstRealInteraction = true; // Variable para rastrear la primera interacción real

    // Deshabilitar el chat hasta que se ingrese la contraseña
    sendButton.disabled = true;
    messageInput.disabled = true;

    passwordButton.addEventListener('click', enterPassword);
    passwordInput.addEventListener('keypress', function (event) {
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
        fetch('https://escalonada-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: [],
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

                    // Habilitar solo el input, el botón de enviar comienza deshabilitado
                    messageInput.disabled = false;
                    sendButton.disabled = true;
                    sendButton.classList.add('disabled');
                    resetButton.disabled = false;

                    // Cargar conversación y productos de ejemplo
                    loadExampleConversation();
                    loadExampleProducts();
                }
            })
            .catch(error => {
                console.error('Error en la inicialización:', error);
                alert('Error al conectarse con el servidor. Por favor, inténtalo de nuevo más tarde.');
            });
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (event) {
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

            // Añadir el mensaje al historial de conversación como string
            conversationHistory.push(messageText);

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
        thinkingMessage.innerHTML = `<p>Pensando...</p>`;
        chatWindow.appendChild(thinkingMessage);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeThinkingAnimation() {
        const thinkingMessages = document.querySelectorAll('.thinking');
        thinkingMessages.forEach(msg => msg.remove());
    }

    function getAssistantResponse() {
        // Utilizar conversationHistory directamente como arreglo de strings
        const messageArray = conversationHistory;
        console.log(JSON.stringify({
            message: messageArray,
            veto: vetoedProducts,
            password: password,
            modo: selectedMode // Usar el modo seleccionado
        }));
        fetch('https://escalonada-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageArray,
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
                    resetButton.disabled = true;
                } else {
                    // Mostrar respuesta del asistente
                    const assistantMessage = document.createElement('div');
                    assistantMessage.classList.add('message', 'assistant');
                    assistantMessage.innerHTML = `<span class="role">Asistente</span><p>${data.Respuesta}</p>`;
                    chatWindow.appendChild(assistantMessage);
                    chatWindow.scrollTop = chatWindow.scrollHeight;

                    // Añadir la respuesta al historial de conversación como string
                    conversationHistory.push(data.Respuesta);

                    // Actualizar recomendaciones
                    updateRecommendations(data.Recomendaciones);

                    // Bloquear el botón después de recibir la respuesta
                    sendButton.disabled = true;
                    sendButton.classList.add('disabled');
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


    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        } else {
            return text;
        }
    }
    function updateRecommendations(productos) {
        recommendationsDiv.innerHTML = '';
        const maxDescriptionLength = 100;

        // Ordenar productos por Similitud de mayor a menor
        productos.sort((a, b) => b.Similitud - a.Similitud);

        // Filtrar todos los productos no vetados
        const todosProductosNoVetados = productos.filter(producto => !vetoedProducts.includes(producto.id));

        // Tomar los primeros 3 para mostrar
        let productosAMostrar = todosProductosNoVetados.slice(0, 3);
        // Guardar el resto en una cola de espera
        let productosEnEspera = todosProductosNoVetados.slice(3);

        function mostrarProducto(producto) {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            const img = document.createElement('img');

            if (producto.Imagenes && producto.Imagenes.length > 0 && producto.Imagenes != "no image") {
                img.src = producto.Imagenes;
                img.alt = producto.Nombre;
            } else {
                img.src = 'NoFoto.png';
            }

            productCard.appendChild(img);
            const productInfo = document.createElement('div');
            productInfo.classList.add('product-info');

            const title = document.createElement('h3');
            const similitudPercentage = (producto.Similitud * 100).toFixed(0) + '%';
            title.textContent = `${producto.Nombre} (${similitudPercentage})`;

            const description = document.createElement('p');
            const fullDescription = producto.Descripcion || '';
            description.textContent = truncateText(fullDescription, maxDescriptionLength);

            productInfo.appendChild(title);
            productInfo.appendChild(description);

            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-button');
            removeButton.textContent = 'Producto no relacionado';

            removeButton.addEventListener('click', function () {
                // Eliminar la tarjeta visualmente
                productCard.remove();

                // Añadir a vetados solo si no está ya en la lista
                if (!vetoedProducts.includes(producto.id)) {
                    vetoedProducts.push(producto.id);
                    console.log('Producto vetado:', producto.id);
                }

                // Si hay productos en espera, mostrar el siguiente
                if (productosEnEspera.length > 0) {
                    const siguienteProducto = productosEnEspera.shift();
                    mostrarProducto(siguienteProducto);
                } else if (document.querySelectorAll('.product-card').length === 0) {
                    // Solo si no quedan productos mostrados, hacer nueva petición
                    const messageArrayWithoutLast = [...conversationHistory];
                    messageArrayWithoutLast.pop();
                    requestNewProducts();
                }
            });

            productCard.appendChild(productInfo);
            productCard.appendChild(removeButton);
            recommendationsDiv.appendChild(productCard);
        }

        // Mostrar los primeros productos
        productosAMostrar.forEach(producto => mostrarProducto(producto));
    }

    function requestNewProducts() {
        // Remover el último mensaje del historial
        const messageArrayWithoutLast = [...conversationHistory];
        messageArrayWithoutLast.pop();

        // Mostrar animación de "pensando"
        showThinkingAnimation();

        fetch('https://escalonada-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageArrayWithoutLast,
                veto: vetoedProducts,
                password: password,
                modo: selectedMode
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(data => {
                removeThinkingAnimation();

                if (data.error && data.error === "Contraseña incorrecta") {
                    // Manejar error de contraseña...
                    handlePasswordError();
                } else {
                    // Solo actualizar las recomendaciones, no añadir respuesta al chat
                    updateRecommendations(data.Recomendaciones);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                removeThinkingAnimation();
                // Mostrar mensaje de error...
                showErrorMessage();
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

        // Añadir mensajes al historial de conversación como strings
        conversationHistory.push('Hola, necesito ayuda con un resfriado.');
        conversationHistory.push('Claro, puedo recomendarle algunos productos.');

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

    resetButton.addEventListener('click', function () {
        // Limpiar el chat
        chatWindow.innerHTML = '';
        // Limpiar las recomendaciones
        recommendationsDiv.innerHTML = '';
        // Reiniciar el historial de conversación
        conversationHistory = [];
        // Reiniciar los productos vetados
        vetoedProducts = [];
        // Reiniciar la bandera de primera interacción
        isFirstRealInteraction = true;
        // Cargar la conversación y productos de ejemplo
        loadExampleConversation();
        loadExampleProducts();
    });

    document.getElementById('send-button').addEventListener('click', function (e) {
        if (!this.classList.contains('active') && !this.disabled) {
            this.classList.add('active');

            gsap.to(this, {
                keyframes: [{
                    '--left-wing-first-x': 50,
                    '--left-wing-first-y': 100,
                    '--right-wing-second-x': 50,
                    '--right-wing-second-y': 100,
                    duration: .2,
                    onComplete() {
                        gsap.set(this, {
                            '--left-wing-first-y': 0,
                            '--left-wing-second-x': 40,
                            '--left-wing-second-y': 100,
                            '--left-wing-third-x': 0,
                            '--left-wing-third-y': 100,
                            '--left-body-third-x': 40,
                            '--right-wing-first-x': 50,
                            '--right-wing-first-y': 0,
                            '--right-wing-second-x': 60,
                            '--right-wing-second-y': 100,
                            '--right-wing-third-x': 100,
                            '--right-wing-third-y': 100,
                            '--right-body-third-x': 60
                        })
                    }
                }, {
                    '--left-wing-third-x': 20,
                    '--left-wing-third-y': 90,
                    '--left-wing-second-y': 90,
                    '--left-body-third-y': 90,
                    '--right-wing-third-x': 80,
                    '--right-wing-third-y': 90,
                    '--right-body-third-y': 90,
                    '--right-wing-second-y': 90,
                    duration: .2
                }, {
                    '--rotate': 50,
                    '--left-wing-third-y': 95,
                    '--left-wing-third-x': 27,
                    '--right-body-third-x': 45,
                    '--right-wing-second-x': 45,
                    '--right-wing-third-x': 60,
                    '--right-wing-third-y': 83,
                    duration: .25
                }, {
                    '--rotate': 55,
                    '--plane-x': -8,
                    '--plane-y': 24,
                    duration: .2
                }, {
                    '--rotate': 40,
                    '--plane-x': 45,
                    '--plane-y': -180,
                    '--plane-opacity': 0,
                    duration: .3,
                    onComplete: () => {
                        setTimeout(() => {
                            this.removeAttribute('style');
                            gsap.fromTo(this, {
                                opacity: 0,
                                y: -8
                            }, {
                                opacity: 1,
                                y: 0,
                                clearProps: true,
                                duration: .3,
                                onComplete: () => {
                                    this.classList.remove('active');
                                }
                            })
                        }, 2000)
                    }
                }]
            });

            gsap.to(this, {
                keyframes: [{
                    '--text-opacity': 0,
                    '--border-radius': 0,
                    '--left-wing-background': getComputedStyle(this).getPropertyValue('--primary-darkest'),
                    '--right-wing-background': getComputedStyle(this).getPropertyValue('--primary-darkest'),
                    duration: .1
                }, {
                    '--left-wing-background': getComputedStyle(this).getPropertyValue('--primary'),
                    '--right-wing-background': getComputedStyle(this).getPropertyValue('--primary'),
                    duration: .1
                }, {
                    '--left-body-background': getComputedStyle(this).getPropertyValue('--primary-dark'),
                    '--right-body-background': getComputedStyle(this).getPropertyValue('--primary-darkest'),
                    duration: .4
                }, {
                    '--success-opacity': 1,
                    '--success-scale': 1,
                    duration: .25,
                    delay: .25
                }]
            });
        }
    });

    // Simplificar el event listener del input
    messageInput.addEventListener('input', function () {
        const isEmpty = !this.value || this.value.trim() === '';
        sendButton.disabled = isEmpty;
        if (isEmpty) {
            sendButton.classList.add('disabled');
        } else {
            sendButton.classList.remove('disabled');
        }
    });

    // Simplificar el event listener del botón de enviar
    sendButton.addEventListener('click', function (e) {
        if (!this.disabled) {
            sendMessage();
        }
    });

    // Simplificar el event listener de la tecla Enter
    messageInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter' && !sendButton.disabled) {
            sendMessage();
        }
    });
});
