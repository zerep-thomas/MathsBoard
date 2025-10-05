import { showModal, hideModal } from '../ui.js';

// Références aux éléments DOM spécifiques au module
const latexModal = document.getElementById('latex-modal');
const latexModalTitle = document.getElementById('latex-modal-title');
const latexInput = document.getElementById('latex-input');
const saveLatexButton = document.getElementById('save-latex-btn');

// Variables d'état
let boardElement = null;
let selectionManager = null;
let currentlyEditingLatex = null; // Stocke l'élément en cours d'édition
let dropCoordinates = { x: 0, y: 0 };

/**
 * Initialise le module LaTeX Libre.
 * @param {HTMLElement} board - Le tableau principal.
 * @param {object} selection - Le gestionnaire de sélection.
 * @returns {object} - Fonctions à exposer (handleDrop, handleDuplicate).
 */
export function initLatexModule(board, selection) {
    boardElement = board;
    selectionManager = selection;

    saveLatexButton.addEventListener('click', handleSave);

    return {
        handleDrop: (x, y, options = {}) => {
            dropCoordinates = { x, y };
            
            if (options.content) {
                // Si un contenu est fourni (ex: "+"), crée l'élément directement
                createLatexElement(options.content, x, y);
            } else {
                // Sinon (outil "Libre"), ouvre la modale
                currentlyEditingLatex = null;
                latexModalTitle.textContent = "Créer une Expression LaTeX";
                saveLatexButton.textContent = "Créer";
                latexInput.value = "";
                showModal(latexModal);
                latexInput.focus();
            }
        },
        handleDuplicate: duplicateLatex
    };
}

/**
 * Gère la sauvegarde (création ou mise à jour) depuis la modale.
 */
function handleSave() {
    const latexCode = latexInput.value.trim();
    if (!latexCode) return;

    if (currentlyEditingLatex) {
        // Mode mise à jour d'un élément existant
        updateLatexRendering(currentlyEditingLatex, latexCode);
    } else {
        // Mode création d'un nouvel élément
        createLatexElement(latexCode, dropCoordinates.x, dropCoordinates.y);
    }

    hideModal(latexModal);
    currentlyEditingLatex = null;
}

/**
 * Crée un nouvel élément LaTeX sur le tableau.
 * @param {string} latexCode - Le code LaTeX à rendre.
 * @param {number} x - Coordonnée X de la souris (depuis l'événement).
 * @param {number} y - Coordonnée Y de la souris (depuis l'événement).
 * @param {object} [options={}] - Options pour la duplication (ex: fontSize).
 * @returns {HTMLElement} - L'élément créé.
 */
function createLatexElement(latexCode, x, y, options = {}) {
    const latexDiv = document.createElement('div');
    latexDiv.className = 'latex-container selectable';
    latexDiv.dataset.module = 'latex';
    latexDiv.dataset.fontSize = options.fontSize || '20';

    // --- DÉBUT DE LA LOGIQUE DE POSITIONNEMENT CORRIGÉE ---

    // 1. Cacher l'élément pour éviter tout "flash" visuel
    latexDiv.style.opacity = '0';
    
    // 2. Ajouter l'élément au DOM pour qu'il puisse être mesuré
    boardElement.appendChild(latexDiv);
    
    // 3. Rendre son contenu pour qu'il ait une taille
    updateLatexRendering(latexDiv, latexCode);

    // 4. Mesurer ses dimensions réelles
    const elementWidth = latexDiv.offsetWidth;
    const elementHeight = latexDiv.offsetHeight;
    
    // 5. Calculer la position finale du coin supérieur gauche pour centrer l'élément
    const boardRect = boardElement.getBoundingClientRect();
    const finalX = (x - boardRect.left) - (elementWidth / 2);
    const finalY = (y - boardRect.top) - (elementHeight / 2);
    
    // 6. Appliquer la position calculée
    latexDiv.style.left = `${finalX}px`;
    latexDiv.style.top = `${finalY}px`;
    
    // 7. Révéler l'élément, maintenant parfaitement positionné
    latexDiv.style.opacity = '1';

    // --- FIN DE LA LOGIQUE DE POSITIONNEMENT CORRIGÉE ---
    
    makeDraggable(latexDiv);
    
    latexDiv.addEventListener('dblclick', (e) => { e.stopPropagation(); openLatexEditor(latexDiv); });
    
    latexDiv.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (!e.ctrlKey && !latexDiv.classList.contains('selected')) {
            selectionManager.deselectAll();
        }
        latexDiv.classList.toggle('selected');
        selectionManager.refreshSelection();
    });

    latexDiv.addEventListener('elementresize', () => {
        updateLatexRendering(latexDiv, latexDiv.dataset.latex);
    });

    return latexDiv;
}

/**
 * Met à jour le rendu visuel d'un élément LaTeX.
 * @param {HTMLElement} element - L'élément à mettre à jour.
 * @param {string} latexCode - Le nouveau code LaTeX.
 */
function updateLatexRendering(element, latexCode) {
    element.dataset.latex = latexCode;
    
    // CORRIGÉ : Applique la taille de police depuis le dataset
    element.style.fontSize = `${element.dataset.fontSize}px`;
    
    try {
        katex.render(latexCode, element, {
            throwOnError: false,
            displayMode: true
        });
    } catch (e) {
        element.textContent = 'Erreur de syntaxe LaTeX';
        console.error(e);
    }
}

/**
 * Ouvre la modale en mode édition pour un élément existant.
 * @param {HTMLElement} element - L'élément à éditer.
 */
function openLatexEditor(element) {
    currentlyEditingLatex = element;
    
    latexModalTitle.textContent = "Modifier l'Expression LaTeX";
    saveLatexButton.textContent = "Enregistrer";
    latexInput.value = element.dataset.latex || "";
    
    showModal(latexModal);
    latexInput.focus();
}

/**
 * Duplique un élément LaTeX existant.
 * @param {HTMLElement} originalElement - L'élément à dupliquer.
 * @returns {HTMLElement} - Le nouvel élément créé.
 */
function duplicateLatex(originalElement) {
    const latexCode = originalElement.dataset.latex;
    // CORRIGÉ : Récupère la taille de police pour la duplication
    const fontSize = originalElement.dataset.fontSize;
    
    // Les coordonnées pour la duplication sont déjà relatives au tableau
    const x = originalElement.offsetLeft + 20;
    const y = originalElement.offsetTop + 20;

    // CORRIGÉ : Passe la taille et un flag de duplication
    return createLatexElement(latexCode, x, y, { fontSize, isDuplication: true });
}

/**
 * Rend un élément déplaçable (fonction utilitaire).
 * @param {HTMLElement} element 
 */
function makeDraggable(element) {
    element.addEventListener('mousedown', (e) => {
        // Ne pas démarrer le drag si on clique sur une poignée de redimensionnement
        if (e.button !== 0 || e.target.classList.contains('resize-handle')) return;

        const selected = element.classList.contains('selected') 
            ? [...document.querySelectorAll('.selectable.selected')] 
            : [element];

        selected.forEach(el => {
            el.startPos = { left: el.offsetLeft, top: el.offsetTop };
        });

        const startX = e.clientX;
        const startY = e.clientY;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            selected.forEach(el => {
                el.style.left = `${el.startPos.left + dx}px`;
                el.style.top = `${el.startPos.top + dy}px`;
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    });
}