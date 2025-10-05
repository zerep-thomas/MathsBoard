import { showModal } from './ui.js';

// Clé API Groq (publique comme demandé)
const GROQ_API_KEY = "REPLACE ME";

/**
 * Initialise la barre de prompt de l'IA et la logique d'appel à l'API.
 * @param {HTMLElement} board - L'élément principal du tableau.
 */
export function initAI(board) {
    const aiPromptBar = document.getElementById('ai-prompt-bar');
    const aiForm = document.getElementById('ai-form');
    const aiInput = document.getElementById('ai-input');
    const aiResponseModal = document.getElementById('ai-response-modal');
    const aiResponseContent = document.getElementById('ai-response-content');
    
    // Écoute l'événement personnalisé 'selectionchange' pour afficher/masquer la barre
    board.addEventListener('selectionchange', (e) => {
        const { selectedElements } = e.detail;
        if (selectedElements.length > 0) {
            aiPromptBar.classList.add('is-visible');
        } else {
            aiPromptBar.classList.remove('is-visible');
        }
    });

    // Gère la soumission du formulaire de prompt
    aiForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userQuestion = aiInput.value.trim();
        if (!userQuestion) return;


        // 1. Récupérer les éléments sélectionnés
        const selectedElementsNodeList = document.querySelectorAll('.selectable.selected');
        
        // 2. Convertir la NodeList en Array et la trier
        const sortedElements = Array.from(selectedElementsNodeList).sort((a, b) => {
            const positionA = a.getBoundingClientRect().left;
            const positionB = b.getBoundingClientRect().left;
            return positionA - positionB; // Trie de la plus petite (gauche) à la plus grande (droite) position
        });

        // 3. Construire le contexte en utilisant le tableau trié
        let context = "Les éléments mathématiques suivants sont fournis dans leur ordre d'apparition sur le tableau, de gauche à droite :\n";
        
        sortedElements.forEach((element, index) => {
            const latex = element.dataset.latex;
            if (!latex) return;

            if (element.dataset.module === 'matrix') {
                context += `Élément ${index + 1} (Matrice): ${latex}\n`;
            } else if (element.dataset.module === 'latex') {
                context += `Élément ${index + 1} (Expression): ${latex}\n`;
            }
        });

        // Note : Si vous ajoutez d'autres modules (ex: 'expression'), vous pourrez ajouter un 'else if' ici.

        const finalMessage = `${context}\nBasé sur ce contexte, réponds à la question suivante : ${userQuestion}`;

        callGroqAPI(finalMessage);
        
        aiInput.value = '';
        aiInput.disabled = true;
    });

    /**
     * Appelle l'API Groq en streaming et affiche la réponse.
     * @param {string} message - Le message complet à envoyer à l'API.
     */
    async function callGroqAPI(message) {
        aiResponseContent.innerHTML = '';
        aiResponseContent.classList.add('is-thinking');
        showModal(aiResponseModal);

        let fullResponseText = '';

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: "Tu es un assistant mathématique expert. Réponds de manière concise et claire à la question en te basant sur les éléments fournis. Ils sont listés dans leur ordre d'apparition visuel. Formate ta réponse en Markdown et utilise la syntaxe LaTeX pour les formules." },
                        { role: "user", content: message }
                    ],
                    model: 'groq/compound',
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 1200,
                    top_p: 1,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erreur HTTP ${response.status}: ${errorData.error?.message || 'Erreur inconnue'}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
                
                for (const line of lines) {
                    const jsonStr = line.replace('data: ', '');
                    if (jsonStr === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices[0]?.delta?.content || '';
                        fullResponseText += content;
                        aiResponseContent.textContent = fullResponseText;
                    } catch (error) {
                        // Ignorer les erreurs de parsing JSON
                    }
                }
            }

        } catch (error) {
            aiResponseContent.textContent = `Une erreur est survenue : ${error.message}`;
            console.error("Erreur lors de l'appel à l'API Groq :", error);
        } finally {
            aiResponseContent.classList.remove('is-thinking');
            aiInput.disabled = false;
            aiInput.focus();
            renderAIResponse(fullResponseText);
        }
    }
    
    /**
     * Met en forme la réponse finale de l'IA avec KaTeX et Markdown.
     * @param {string} textContent - Le texte brut de la réponse.
     */
    function renderAIResponse(textContent) {
        aiResponseContent.textContent = textContent;

        // 1. Rendu LaTeX avec KaTeX
        renderMathInElement(aiResponseContent, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });

        // 2. Rendu Markdown
        const md = window.markdownit({ html: true });
        aiResponseContent.innerHTML = md.render(aiResponseContent.innerHTML);
    }
}