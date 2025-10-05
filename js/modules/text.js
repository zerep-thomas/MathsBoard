import { makeDraggable } from '../utils.js';

/**
 * Initialise le module de Texte.
 * @param {HTMLElement} board - L'élément du tableau principal.
 * @param {object} selection - Le gestionnaire de sélection.
 * @returns {object} - Un objet avec les fonctions à exposer (handleDrop, handleDuplicate).
 */
export function initTextModule(board, selection) {
    boardElement = board;
    selectionManager = selection;

    // Gère le clic en dehors des textareas pour les désactiver
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.text-container.is-editing').forEach(container => {
            if (!container.contains(e.target)) {
                deactivateEditing(container);
            }
        });
    });

    return {
        handleDrop: (x, y) => {
            createTextElement("", x, y);
        },
        handleDuplicate: duplicateText
    };
}

// Variables d'état
let boardElement = null;
let selectionManager = null;

/**
 * Crée un nouvel élément de texte sur le tableau.
 * @param {string} initialText - Le texte initial à afficher.
 * @param {number} x - Coordonnée X de la souris.
 * @param {number} y - Coordonnée Y de la souris.
 * @param {object} [options={}] - Options pour la duplication (ex: fontSize).
 * @returns {HTMLElement} - L'élément de texte créé.
 */
function createTextElement(initialText, x, y, options = {}) {
    const textContainer = document.createElement('div');
    textContainer.className = 'text-container selectable';
    textContainer.dataset.module = 'text';
    textContainer.dataset.text = initialText;
    textContainer.dataset.fontSize = options.fontSize || '16';

    // Logique de positionnement : cacher, ajouter, mesurer, positionner, révéler
    textContainer.style.opacity = '0';
    boardElement.appendChild(textContainer);
    
    // Le rendu initial se fait en mode non-éditable pour mesurer la taille
    updateTextRendering(textContainer, initialText);

    const elementWidth = textContainer.offsetWidth;
    const elementHeight = textContainer.offsetHeight;
    const boardRect = boardElement.getBoundingClientRect();
    
    textContainer.style.left = `${(x - boardRect.left) - (elementWidth / 2)}px`;
    textContainer.style.top = `${(y - boardRect.top) - (elementHeight / 2)}px`;
    textContainer.style.opacity = '1';

    // Attache les gestionnaires d'événements
    makeDraggable(textContainer);
    
    textContainer.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        activateEditing(textContainer);
    });
    
    textContainer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (e.target.tagName === 'TEXTAREA' || e.button !== 0) return;
        if (!e.ctrlKey && !textContainer.classList.contains('selected')) {
            selectionManager.deselectAll();
        }
        textContainer.classList.toggle('selected');
        selectionManager.refreshSelection();
    });

    textContainer.addEventListener('elementresize', () => {
        updateTextRendering(textContainer, textContainer.dataset.text);
    });

    // Passe en mode édition dès la création
    activateEditing(textContainer);

    return textContainer;
}


/**
 * Passe un conteneur de texte en mode édition (affiche un textarea).
 * @param {HTMLElement} container 
 */
function activateEditing(container) {
    if (container.classList.contains('is-editing')) return;

    // Désactive tous les autres
    document.querySelectorAll('.text-container.is-editing').forEach(deactivateEditing);

    container.classList.add('is-editing');
    const currentText = container.dataset.text;
    container.innerHTML = ''; // Vide le conteneur

    const textarea = document.createElement('textarea');
    textarea.value = currentText;

    const autoResizeTextareaHeight = () => {
        // 1. On réinitialise la hauteur. C'est crucial pour forcer le 
        //    navigateur à recalculer la hauteur minimale nécessaire.
        textarea.style.height = 'auto'; 
        
        // 2. On lit la propriété `scrollHeight` (hauteur totale du contenu, y compris ce qui est caché)
        //    et on l'applique comme nouvelle hauteur au textarea.
        textarea.style.height = `${textarea.scrollHeight}px`;
    };
    
    // Ajuste la hauteur du textarea au contenu
    const autoResizeTextarea = () => {
        textarea.style.height = '1.4em';
        textarea.style.height = `${textarea.scrollHeight}px`;
    };
    
    textarea.addEventListener('input', () => {
            const measurer = document.createElement('span');
            measurer.style.visibility = 'hidden';
            measurer.style.position = 'absolute';
            measurer.style.whiteSpace = 'pre';
            measurer.style.font = window.getComputedStyle(textarea).font;
            measurer.textContent = textarea.value || ' ';
        

            document.body.appendChild(measurer);
            const newWidth = Math.min(measurer.offsetWidth + 16, 600); // +16 pour padding, 600 max
            document.body.removeChild(measurer);

            textarea.style.width = `${newWidth}px`;
            autoResizeTextarea();
            container.dataset.text = textarea.value; // Met à jour en temps réel
        });
    
    // Gère la désactivation quand on clique ailleurs ou quand on appuie sur Echap
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            textarea.blur(); 
        }
    });
    
    textarea.addEventListener('blur', () => {
        deactivateEditing(container);
    });

    container.appendChild(textarea);
    

    autoResizeTextareaWidth(textarea);
    autoResizeTextareaHeight();
    
    // Appel initial pour ajuster la taille
    autoResizeTextarea();

    textarea.focus();
    textarea.select();
}

/**
 * Calcule et ajuste la largeur du textarea en fonction de son contenu.
 * @param {HTMLTextAreaElement} textarea L'élément textarea à redimensionner.
 */

function autoResizeTextareaWidth(textarea) {
    const measurer = document.createElement('span');
    // Le span doit être caché mais mesurable, et avoir les mêmes styles de police
    measurer.style.visibility = 'hidden';
    measurer.style.position = 'absolute';
    measurer.style.whiteSpace = 'pre'; // Important pour respecter les espaces
    measurer.style.font = window.getComputedStyle(textarea).font;
    
    // Utilise le texte du textarea, ou un espace pour éviter une largeur de 0
    measurer.textContent = textarea.value || ' ';

    // Ajoute le span au corps pour le mesurer, puis le retire
    document.body.appendChild(measurer);
    // On ajoute un petit padding (ex: 16px) pour que le texte ne soit pas collé au bord
    const newWidth = Math.min(measurer.offsetWidth + 12, 600); // 600px est une largeur max optionnelle
    document.body.removeChild(measurer);

    textarea.style.width = `${newWidth}px`;
}



/**
 * Passe un conteneur de texte en mode inactif (affiche un div).
 * @param {HTMLElement} container 
 */
function deactivateEditing(container) {
    if (!container || !container.classList.contains('is-editing')) return;

    const textarea = container.querySelector('textarea');
    if (textarea) {
       container.dataset.text = textarea.value;
    }
    
    container.classList.remove('is-editing');
    updateTextRendering(container, container.dataset.text);
}



/**
 * Met à jour le contenu visuel et le style d'un élément texte.
 * @param {HTMLElement} element 
 * @param {string} text 
 */
function updateTextRendering(element, text) {
    element.innerHTML = ''; // Vide l'ancien contenu
    const displayDiv = document.createElement('div');
    displayDiv.className = 'text-display';
    
    if (text) {
        displayDiv.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        // Un espace insécable garantit que l'élément reste cliquable même s'il est vide
        displayDiv.innerHTML = '&nbsp;'; 
    }
    // ==========================================================

    element.appendChild(displayDiv);
    
    element.style.fontSize = `${element.dataset.fontSize}px`;
}


/**
 * Duplique un élément de texte existant.
 * @param {HTMLElement} originalElement - L'élément à dupliquer.
 * @returns {HTMLElement} - Le nouvel élément créé.
 */
function duplicateText(originalElement) {
    const text = originalElement.dataset.text;
    const fontSize = originalElement.dataset.fontSize;
    const boardRect = boardElement.getBoundingClientRect();
    const originalRect = originalElement.getBoundingClientRect();

    const x = (originalRect.left - boardRect.left) + 200 + (originalRect.width / 2);
    const y = (originalRect.top - boardRect.top) + 35 + (originalRect.height / 2);

    return createTextElement(text, x, y, { fontSize });
}
