document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');
    const recommendationsDiv = document.getElementById('recommendations');
    const relatedProductsDiv = document.getElementById('related-products');
    const resetButton = document.getElementById('reset-button');

    const productPopup = document.getElementById('product-popup');
    const popupContent = document.getElementById('popup-details');
    const closeButton = document.querySelector('.close-button');

    const toggleRelatedButton = document.getElementById('toggle-related-products');
    const toggleText = document.getElementById('toggle-text');
    const toggleIcon = document.getElementById('toggle-icon');

    const relatedProductsSection = document.getElementById('related-products-section');


    let vetoedProducts = []; // Array de IDs de productos vetados
    let password = 'cofares_everest'; // Reemplaza con tu contraseña real
    let conversationHistory = []; // Array para mantener el historial de la conversación como strings
    let isFirstRealInteraction = true; // Variable para rastrear la primera interacción real
    let top_k = 20;

    // Deshabilitar el chat hasta que se inicie correctamente
    sendButton.disabled = true;
    messageInput.disabled = true;


    // Elementos del DOM relacionados con ajustes
    const settingsButton = document.getElementById('settings-button');
    const settingsPopup = document.getElementById('settings-popup');
    const settingsCloseButton = settingsPopup.querySelector('.close-button');
    const topKInput = document.getElementById('top-k-input');
    const passwordInput = document.getElementById('password-input');
    const togglePasswordButton = document.getElementById('toggle-password-button');

    // Mostrar el pop-up de ajustes al hacer clic en el botón de ajustes
    settingsButton.addEventListener('click', function () {
        settingsPopup.style.display = 'block';
    });

    // Cerrar el pop-up de ajustes al hacer clic en la 'X'
    settingsCloseButton.addEventListener('click', function () {
        settingsPopup.style.display = 'none';
    });

    // Cerrar el pop-up de ajustes al hacer clic fuera de él
    window.addEventListener('click', function (event) {
        if (event.target == settingsPopup) {
            settingsPopup.style.display = 'none';
        }
    });

    // Actualizar el valor de top_k cuando el usuario lo cambie
    topKInput.addEventListener('change', function () {
        top_k = parseInt(topKInput.value);
    });

    // Mostrar y ocultar la contraseña al mantener presionado el botón con el icono de ojo
    togglePasswordButton.addEventListener('mousedown', function () {
        passwordInput.type = 'text';
        togglePasswordButton.querySelector('.material-icons').textContent = 'visibility_off';
    });

    togglePasswordButton.addEventListener('mouseup', function () {
        passwordInput.type = 'password';
        togglePasswordButton.querySelector('.material-icons').textContent = 'visibility';
    });

    togglePasswordButton.addEventListener('mouseleave', function () {
        passwordInput.type = 'password';
        togglePasswordButton.querySelector('.material-icons').textContent = 'visibility';
    });

    // Actualizar la variable de contraseña cuando el usuario la cambie
    passwordInput.addEventListener('input', function () {
        password = passwordInput.value;
    });




    // Array de textos cambiantes
    const loadingTexts = [
        "Echando un ojo en el almacén...",
        "Hay muchos productos aquí... dame un segundo",
        "Este almacén parece una jungla",
    ];
    let loadingTextIndex = 0;
    let loadingTextInterval;

    // Función para mostrar la animación de carga y los textos
    function showLoadingAnimation() {
        const loadingAnimation = document.getElementById('loading-animation');
        const loadingTextElement = document.getElementById('loading-text');
        loadingAnimation.style.display = 'block';

        // Inicializa el texto
        loadingTextElement.textContent = loadingTexts[loadingTextIndex];

        // Cambia el texto cada 3 segundos
        loadingTextInterval = setInterval(() => {
            loadingTextIndex = (loadingTextIndex + 1) % loadingTexts.length;
            loadingTextElement.textContent = loadingTexts[loadingTextIndex];
        }, 5000);
    }

    // Función para ocultar la animación de carga y detener los textos
    function hideLoadingAnimation() {
        const loadingAnimation = document.getElementById('loading-animation');
        loadingAnimation.style.display = 'none';

        clearInterval(loadingTextInterval);
        loadingTextIndex = 0;
    }




    initializeConversation();

    function initializeConversation() {
        fetch('https://reiterado-1030919964783.europe-west1.run.app/consulta', {
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
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(data => {
                if (data.error && data.error === "Contraseña incorrecta") {
                    alert('Contraseña incorrecta. Por favor, inténtalo de nuevo.');
                } else {
                    console.log('Inicialización exitosa:', data);

                    // Habilitar el chat
                    sendButton.disabled = false;
                    messageInput.disabled = false;
                    resetButton.disabled = false;

                    // Cargar conversación y productos de ejemplo
                    loadExampleConversation();
                    loadExampleProducts();
                    loadExampleRelatedProducts();
                }
            })
            .catch(error => {
                console.error('Error en la inicialización:', error);
                alert('Error al conectarse con el servidor. Por favor, inténtalo de nuevo más tarde.');
            });
    }

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            if (isFirstRealInteraction) {
                chatWindow.innerHTML = '';
                recommendationsDiv.innerHTML = '';
                // relatedProductsDiv.innerHTML = '';
                conversationHistory = [];
                isFirstRealInteraction = false;
            }

            // Mostrar mensaje del farmacéutico
            const pharmacistMessage = document.createElement('div');
            pharmacistMessage.classList.add('message', 'pharmacist');
            pharmacistMessage.innerHTML = `<span class="role">Farmacéutico</span><p>${messageText}</p>`;
            chatWindow.appendChild(pharmacistMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            conversationHistory.push(messageText);

            messageInput.value = '';

            // Mostrar animación de "pensando"
            showThinkingAnimation();

            // Obtener respuesta del asistente
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
        showLoadingAnimation();
        const messageArray = conversationHistory;
        const requestData = {
            message: messageArray,
            veto: vetoedProducts,
            password: password,
            top_k: top_k
        };

        function makeRequest() {
            fetch('https://reiterado-1030919964783.europe-west1.run.app/consulta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
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
                        alert('Contraseña incorrecta. Por favor, vuelve a iniciar sesión.');
                        sendButton.disabled = true;
                        messageInput.disabled = true;
                        conversationHistory = [];
                        chatWindow.innerHTML = '';
                        recommendationsDiv.innerHTML = '';
                        resetButton.disabled = true;
                    } else {
                        // Mostrar respuesta del asistente
                        const assistantMessage = document.createElement('div');
                        assistantMessage.classList.add('message', 'assistant');
                        assistantMessage.innerHTML = `<span class="role">Asistente</span><p>${data.Respuesta}</p>`;
                        chatWindow.appendChild(assistantMessage);
                        chatWindow.scrollTop = chatWindow.scrollHeight;

                        conversationHistory.push(data.Respuesta);

                        // Actualizar recomendaciones
                        hideLoadingAnimation();

                        updateRecommendations(data.Recomendaciones);

                        // Actualizar productos relacionados si los hay
                        // if (data.RelatedProducts && data.RelatedProducts.length > 0) {
                        //     updateRelatedProducts(data.RelatedProducts);
                        // }

                        // Habilitar el botón de enviar
                        sendButton.disabled = false;
                        sendButton.classList.remove('disabled');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    hideLoadingAnimation();
                    removeThinkingAnimation();

                    // Crear y mostrar el popup de error
                    const errorPopup = document.createElement('div');
                    errorPopup.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #ff6b6b;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    text-align: center;
                `;
                    errorPopup.textContent = "El servidor está teniendo problemas. Reintentando en 1 segundo...";
                    document.body.appendChild(errorPopup);

                    // Mostrar mensaje de reintento en el chat
                    const retryMessage = document.createElement('div');
                    retryMessage.classList.add('message', 'assistant');
                    retryMessage.innerHTML = `<span class="role">Asistente</span><p>Error 429, servidor sobrecargado. Volviendo a intentar...</p>`;
                    chatWindow.appendChild(retryMessage);
                    chatWindow.scrollTop = chatWindow.scrollHeight;

                    // Eliminar el popup después de 2 segundos
                    setTimeout(() => {
                        errorPopup.remove();
                    }, 2000);

                    // Reintentar la petición después de 1 segundo
                    setTimeout(() => {
                        makeRequest();
                    }, 1000);
                });
        }

        makeRequest();
    }

    function updateRecommendations(productos) {
        recommendationsDiv.innerHTML = '';
        productos.forEach(producto => mostrarProducto(producto, recommendationsDiv));
    }

    function updateRelatedProducts(productos) {
        relatedProductsDiv.innerHTML = '';
        productos.forEach(producto => mostrarProducto(producto, relatedProductsDiv));
    }

    function mostrarProducto(producto, containerDiv) {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        const img = document.createElement('img');

        if (producto.Imagenes && producto.Imagenes.length > 0 && producto.Imagenes !== "no image") {
            img.src = producto.Imagenes;
            img.alt = producto.Nombre;
        } else {
            img.src = 'NoFoto.png';
        }

        productCard.appendChild(img);
        const productInfo = document.createElement('div');
        productInfo.classList.add('product-info');

        const title = document.createElement('h3');
        const similitudPercentage = (producto.Valoracion) + '/10';
        title.textContent = `${producto.Nombre} - (${similitudPercentage})`;

        const description = document.createElement('p');
        description.textContent = truncateText(producto.Descripcion, 100);

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-button');
        removeButton.textContent = 'Producto no relacionado';

        removeButton.addEventListener('click', function (event) {
            event.stopPropagation();
            productCard.remove();
            if (!vetoedProducts.includes(producto.id)) {
                vetoedProducts.push(producto.id);
            }
            // Comprobar si todas las recomendaciones han sido vetadas
            if (recommendationsDiv.children.length === 0) {
                showLoadingAnimation();
                getNewRecommendations();
            }
        });

        productInfo.appendChild(title);
        productInfo.appendChild(description);
        productInfo.appendChild(removeButton);

        productCard.appendChild(productInfo);

        productCard.addEventListener('click', function () {
            showProductPopup(producto);
        });

        containerDiv.appendChild(productCard);
    }

    function truncateText(text, maxLength) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 3) + '...';
        } else {
            return text;
        }
    }

    function getNewRecommendations() {
        showLoadingAnimation();

        const messageArray = conversationHistory;
        console.log(JSON.stringify({
            message: messageArray,
            veto: vetoedProducts,
            password: password,
            top_k: top_k
        }));

        fetch('https://reiterado-1030919964783.europe-west1.run.app/consulta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageArray,
                veto: vetoedProducts,
                password: password,
                top_k: top_k
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la respuesta del servidor');
                }
                return response.json();
            })
            .then(data => {
                hideLoadingAnimation();

                if (data.error && data.error === "Contraseña incorrecta") {
                    alert('Contraseña incorrecta. Por favor, vuelve a iniciar sesión.');
                    sendButton.disabled = true;
                    messageInput.disabled = true;
                    conversationHistory = [];
                    chatWindow.innerHTML = '';
                    recommendationsDiv.innerHTML = '';
                    resetButton.disabled = true;
                } else {
                    // Actualizar recomendaciones
                    updateRecommendations(data.Recomendaciones);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                hideLoadingAnimation();

                // Mostrar mensaje de error en el chat
                const errorMessage = document.createElement('div');
                errorMessage.classList.add('message', 'assistant');
                errorMessage.innerHTML = `<span class="role">Asistente</span><p>Ocurrió un error al obtener las recomendaciones. Por favor, inténtalo de nuevo.</p>`;
                chatWindow.appendChild(errorMessage);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            });
    }


    function showProductPopup(producto) {
        popupContent.innerHTML = '';

        const img = document.createElement('img');
        if (producto.Imagenes && producto.Imagenes.length > 0 && producto.Imagenes !== "no image") {
            img.src = producto.Imagenes;
            img.alt = producto.Nombre;
        } else {
            img.src = 'NoFoto.png';
        }


        const title = document.createElement('h3');
        title.textContent = producto.Nombre;

        const description = document.createElement('p');
        description.textContent = truncateText(producto.Descripcion, 200);
        description.classList.add('popup-description');

        popupContent.appendChild(img);
        popupContent.appendChild(title);
        popupContent.appendChild(description);

        if (producto.Descripcion.length > 200) {
            const readMoreButton = document.createElement('button');
            readMoreButton.classList.add('read-more-button');
            readMoreButton.textContent = 'Leer más...';

            readMoreButton.addEventListener('click', function () {
                description.textContent = producto.Descripcion;
                readMoreButton.style.display = 'none';
            });

            popupContent.appendChild(readMoreButton);
        }

        productPopup.style.display = 'block';
    }

    closeButton.addEventListener('click', function () {
        productPopup.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target == productPopup) {
            productPopup.style.display = 'none';
        }
    });

    function loadExampleConversation() {
        const pharmacistMessage = document.createElement('div');
        pharmacistMessage.classList.add('message', 'pharmacist');
        pharmacistMessage.innerHTML = `<span class="role">Farmacéutico</span><p>Hola, necesito ayuda con un resfriado.</p>`;
        chatWindow.appendChild(pharmacistMessage);

        const assistantMessage = document.createElement('div');
        assistantMessage.classList.add('message', 'assistant');
        assistantMessage.innerHTML = `<span class="role">Asistente</span><p>Claro, puedo recomendarle algunos productos.</p>`;
        chatWindow.appendChild(assistantMessage);

        conversationHistory.push('Hola, necesito ayuda con un resfriado.');
        conversationHistory.push('Claro, puedo recomendarle algunos productos.');

        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function loadExampleProducts() {
        const exampleProducts = [
            {
                id: 'producto1',
                Nombre: 'Producto de Ejemplo 1',
                Descripcion: 'Descripción detallada del producto 1. Este producto es ideal para tratar síntomas comunes de resfriado y gripe. Contiene ingredientes naturales que ayudan a aliviar la congestión nasal y el dolor de garganta...',
                Imagenes: ['foto1.jpg'],
                Valoracion: 9
            },
            {
                id: 'producto2',
                Nombre: 'Producto de Ejemplo 2',
                Descripcion: 'Descripción detallada del producto 2. Este producto es excelente para reducir la fiebre y aliviar dolores musculares asociados con el resfriado común...',
                Imagenes: ['foto2.jpg'],
                Valoracion: 8
            },
            {
                id: 'producto3',
                Nombre: 'Producto de Ejemplo 3',
                Descripcion: 'Descripción detallada del producto 3. Un jarabe eficaz para calmar la tos y mejorar la respiración durante el resfriado...',
                Imagenes: ['foto3.webp'],
                Valoracion: 7
            }
        ];

        updateRecommendations(exampleProducts);
    }

    function loadExampleRelatedProducts() {
        const exampleRelatedProducts = [
            {
                id: 'related1',
                Nombre: 'Cepillo de dientes',
                Descripcion: 'Suplemento de vitamina C para fortalecer el sistema inmunológico.',
                Imagenes: ['cepillo.jpg'],
                Valoracion: 8
            },
            {
                id: 'related2',
                Nombre: 'Hilo Dental',
                Descripcion: 'Spray nasal descongestionante para aliviar la congestión nasal.',
                Imagenes: ['hilo_dental.jpg'],
                Valoracion: 7
            },
            {
                id: 'related3',
                Nombre: 'Enjuague',
                Descripcion: 'Pastillas de menta para refrescar la garganta y facilitar la respiración.',
                Imagenes: ['enjuague.jpg'],
                Valoracion: 6
            }
        ];

        updateRelatedProducts(exampleRelatedProducts);
    }

    resetButton.addEventListener('click', function () {
        chatWindow.innerHTML = '';
        recommendationsDiv.innerHTML = '';
        // relatedProductsDiv.innerHTML = '';
        conversationHistory = [];
        vetoedProducts = [];
        isFirstRealInteraction = true;
        loadExampleConversation();
        loadExampleProducts();
        loadExampleRelatedProducts();
    });

    messageInput.addEventListener('input', function () {
        const isEmpty = !this.value || this.value.trim() === '';
        sendButton.disabled = isEmpty;
        if (isEmpty) {
            sendButton.classList.add('disabled');
        } else {
            sendButton.classList.remove('disabled');
        }
    });

    sendButton.addEventListener('click', function (e) {
        if (!this.disabled) {
            sendMessage();
        }
    });

    messageInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter' && !sendButton.disabled) {
            sendMessage();
        }
    });

    toggleRelatedButton.addEventListener('click', function () {
        if (relatedProductsDiv.classList.contains('collapsed')) {
            relatedProductsDiv.classList.remove('collapsed');
            relatedProductsSection.classList.remove('collapsed'); // Removemos la clase 'collapsed'
            toggleText.textContent = 'Ocultar';
            toggleIcon.textContent = '▲';
        } else {
            relatedProductsDiv.classList.add('collapsed');
            relatedProductsSection.classList.add('collapsed'); // Añadimos la clase 'collapsed'
            toggleText.textContent = 'Mostrar';
            toggleIcon.textContent = '▼';
        }
    });

    // Inicialmente, la sección está colapsada
    relatedProductsDiv.classList.add('collapsed');
    toggleText.textContent = 'Mostrar';
    toggleIcon.textContent = '▼';

    document.querySelectorAll('.button_plane').forEach(button => {

        let getVar = variable => getComputedStyle(button).getPropertyValue(variable);

        button.addEventListener('click', e => {

            if (!button.classList.contains('active')) {

                button.classList.add('active');

                gsap.to(button, {
                    keyframes: [{
                        '--left-wing-first-x': 50,
                        '--left-wing-first-y': 100,
                        '--right-wing-second-x': 50,
                        '--right-wing-second-y': 100,
                        duration: .2,
                        onComplete() {
                            gsap.set(button, {
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
                        '--rotate': 60,
                        '--plane-x': -8,
                        '--plane-y': 40,
                        duration: .2
                    }, {
                        '--rotate': 40,
                        '--plane-x': 45,
                        '--plane-y': -300,
                        '--plane-opacity': 0,
                        duration: .375,
                        onComplete() {
                            setTimeout(() => {
                                button.removeAttribute('style');
                                gsap.fromTo(button, {
                                    opacity: 0,
                                    y: -8
                                }, {
                                    opacity: 1,
                                    y: 0,
                                    clearProps: true,
                                    duration: .3,
                                    onComplete() {
                                        button.classList.remove('active');
                                    }
                                })
                            }, 1800)
                        }
                    }]
                })

                gsap.to(button, {
                    keyframes: [{
                        '--text-opacity': 0,
                        '--border-radius': 0,
                        '--left-wing-background': getVar('--primary-dark'),
                        '--right-wing-background': getVar('--primary-dark'),
                        duration: .11
                    }, {
                        '--left-wing-background': getVar('--primary'),
                        '--right-wing-background': getVar('--primary'),
                        duration: .14
                    }, {
                        '--left-body-background': getVar('--primary-dark'),
                        '--right-body-background': getVar('--primary-darkest'),
                        duration: .25,
                        delay: .1
                    }, {
                        '--trails-stroke': 171,
                        duration: .22,
                        delay: .22
                    }, {
                        '--success-opacity': 1,
                        '--success-x': 0,
                        duration: .2,
                        delay: .15
                    }, {
                        '--success-stroke': 0,
                        duration: .15
                    }]
                })

            }

        })

    });

});
