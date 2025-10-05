import { showModal, hideModal } from '../ui.js';

// Références aux éléments DOM spécifiques à la matrice
const createModal = document.getElementById('matrix-create-modal');
const editModal = document.getElementById('matrix-edit-modal');
const createMatrixButton = document.getElementById('create-matrix-btn');
const saveMatrixButton = document.getElementById('save-matrix-changes-btn');
const editorLayout = document.getElementById('matrix-editor-layout');

// Variables d'état propres au module
let boardElement = null;
let selectionManager = null;
let currentlyEditingMatrix = null;
let modalMatrixData = null; // Données temporaires de la matrice dans l'éditeur
let dropCoordinates = { x: 0, y: 0 };

/**
 * Initialise le module Matrice.
 * @param {HTMLElement} board - L'élément du tableau principal.
 * @param {object} selection - Le gestionnaire de sélection.
 * @returns {object} - Un objet avec les fonctions à exposer (handleDrop, handleDuplicate).
 */
export function initMatrixModule(board, selection) {
    boardElement = board;
    selectionManager = selection;

    createMatrixButton.addEventListener('click', () => {
        const rows = document.getElementById('rows').value;
        const cols = document.getElementById('cols').value;
        createMatrix(rows, cols, dropCoordinates.x, dropCoordinates.y);
        hideModal(createModal);
    });

    saveMatrixButton.addEventListener('click', saveMatrixChanges);

    return {
        handleDrop: (x, y) => {
            dropCoordinates = { x, y };
            showModal(createModal);
        },
        handleDuplicate: duplicateMatrix
    };
}

/**
 * Crée un nouvel élément de matrice sur le tableau.
 * @param {number} rows - Nombre de lignes.
 * @param {number} cols - Nombre de colonnes.
 * @param {number} x - Coordonnée X de la souris.
 * @param {number} y - Coordonnée Y de la souris.
 * @param {object} [options={}] - Options supplémentaires (données, taille de police).
 * @returns {HTMLElement} - L'élément de matrice créé.
 */
function createMatrix(rows, cols, x, y, options = {}) {
    const matrixDiv = document.createElement('div');
    matrixDiv.className = 'matrix-container selectable';
    matrixDiv.dataset.module = 'matrix';
    
    Object.assign(matrixDiv.dataset, {
        rows,
        cols,
        fontSize: options.fontSize || '20'
    });
    
    const initialData = options.data || Array.from({ length: rows }, (_, i) => 
        Array.from({ length: cols }, (_, j) => `a_{${i + 1}${j + 1}}`)
    );

    // --- DÉBUT DE LA LOGIQUE DE POSITIONNEMENT CORRIGÉE ---

    // 1. Cacher l'élément
    matrixDiv.style.opacity = '0';
    
    // 2. Ajouter au DOM
    boardElement.appendChild(matrixDiv);
    
    // 3. Rendre le contenu
    updateMatrixRendering(matrixDiv, initialData);

    // 4. Mesurer
    const elementWidth = matrixDiv.offsetWidth;
    const elementHeight = matrixDiv.offsetHeight;
    
    // 5. Calculer la position centrée
    const boardRect = boardElement.getBoundingClientRect();
    const finalX = (x - boardRect.left) - (elementWidth / 5);
    const finalY = (y - boardRect.top) - (elementHeight / 5);
    
    // 6. Appliquer la position
    matrixDiv.style.left = `${finalX}px`;
    matrixDiv.style.top = `${finalY}px`;
    
    // 7. Révéler
    matrixDiv.style.opacity = '1';

    // --- FIN DE LA LOGIQUE DE POSITIONNEMENT CORRIGÉE ---

    makeDraggable(matrixDiv);
    
    matrixDiv.addEventListener('dblclick', (e) => { e.stopPropagation(); openMatrixEditor(matrixDiv); });
    
    matrixDiv.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (!e.ctrlKey && !matrixDiv.classList.contains('selected')) {
            selectionManager.deselectAll();
        }
        matrixDiv.classList.toggle('selected');
        selectionManager.refreshSelection();
    });

    matrixDiv.addEventListener('elementresize', () => {
        const data = JSON.parse(matrixDiv.dataset.matrix);
        updateMatrixRendering(matrixDiv, data);
    });

    return matrixDiv;
}

/**
 * Duplique une matrice existante.
 * @param {HTMLElement} originalMatrix - La matrice à dupliquer.
 * @returns {HTMLElement} - La nouvelle matrice dupliquée.
 */
function duplicateMatrix(originalMatrix) {
    const data = JSON.parse(originalMatrix.dataset.matrix);
    const fontSize = parseFloat(originalMatrix.dataset.fontSize || '20');
    const newX = originalMatrix.offsetLeft ;
    const newY = originalMatrix.offsetTop;

    return createMatrix(data.length, data[0].length, newX, newY, { data, fontSize });
}

/**
 * Met à jour le rendu visuel d'une matrice en utilisant KaTeX.
 * @param {HTMLElement} matrixDiv - L'élément de la matrice.
 * @param {Array<Array<string>>} data - Les données 2D de la matrice.
 */
function updateMatrixRendering(matrixDiv, data) {
    const latexString = `\\begin{pmatrix}${data.map(row => row.join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;
    
    matrixDiv.dataset.matrix = JSON.stringify(data);
    matrixDiv.dataset.latex = latexString;
    matrixDiv.style.fontSize = `${matrixDiv.dataset.fontSize}px`;
    
    try {
        katex.render(latexString, matrixDiv, {
            throwOnError: false,
            displayMode: true
        });
    } catch (e) {
        matrixDiv.textContent = 'Erreur de syntaxe LaTeX';
        console.error(e);
    }
}

/**
 * Ouvre l'éditeur de matrice dans une modale.
 * @param {HTMLElement} matrixDiv - La matrice à éditer.
 */
function openMatrixEditor(matrixDiv) {
    currentlyEditingMatrix = matrixDiv;
    modalMatrixData = JSON.parse(matrixDiv.dataset.matrix);
    rebuildEditorUI();
    showModal(editModal);
}

/**
 * Sauvegarde les changements effectués dans l'éditeur.
 */
function saveMatrixChanges() {
    if (!currentlyEditingMatrix) return;

    const inputs = Array.from(editorLayout.querySelectorAll('.matrix-grid input'));
    const finalRows = modalMatrixData.length;
    const finalCols = modalMatrixData[0].length;
    const newData = Array.from({ length: finalRows }, (_, i) => 
        inputs.slice(i * finalCols, (i + 1) * finalCols).map(input => input.value)
    );

    updateMatrixRendering(currentlyEditingMatrix, newData);
    hideModal(editModal);
    currentlyEditingMatrix = null;
    modalMatrixData = null;
}

/**
 * Reconstruit l'interface de l'éditeur dans la modale.
 */
function rebuildEditorUI() {
    if (!modalMatrixData) return;

    const cols = modalMatrixData[0].length;

    const gridHTML = `<div class="matrix-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
        ${modalMatrixData.map(row => row.map(cell => `<input type="text" value="${cell}">`).join('')).join('')}
    </div>`;

    const rowControls = `<div class="matrix-row-controls">
        <button class="matrix-op-btn" data-action="add" data-type="row">+</button>
        <button class="matrix-op-btn" data-action="remove" data-type="row">-</button>
    </div>`;
    const colControls = `<div class="matrix-col-controls">
        <button class="matrix-op-btn" data-action="add" data-type="col">+</button>
        <button class="matrix-op-btn" data-action="remove" data-type="col">-</button>
    </div>`;
    
    editorLayout.innerHTML = `${gridHTML} ${colControls} ${rowControls}`;
    
    editorLayout.querySelectorAll('.matrix-op-btn').forEach(btn => {
        btn.onclick = () => modifyMatrixDimension(btn.dataset.type, btn.dataset.action);
    });
}

/**
 * Ajoute ou supprime une ligne/colonne dans l'éditeur.
 * @param {'row'|'col'} type - Le type de dimension à modifier.
 * @param {'add'|'remove'} action - L'action à effectuer.
 */
function modifyMatrixDimension(type, action) {
    const inputs = Array.from(editorLayout.querySelectorAll('.matrix-grid input'));
    const oldRows = modalMatrixData.length;
    const oldCols = modalMatrixData[0].length;
    let data = Array.from({ length: oldRows }, (_, i) => 
        inputs.slice(i * oldCols, (i + 1) * oldCols).map(input => input.value)
    );

    if (type === 'row') {
        if (action === 'add') data.push(Array(oldCols).fill('0'));
        else if (oldRows > 1) data.pop();
    } else { // 'col'
        if (action === 'add') data.forEach(row => row.push('0'));
        else if (oldCols > 1) data.forEach(row => row.pop());
    }

    modalMatrixData = data;
    rebuildEditorUI();
}

/**
 * Rend un élément déplaçable sur le tableau.
 * @param {HTMLElement} element - L'élément à rendre déplaçable.
 */
function makeDraggable(element) {
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.classList.contains('resize-handle')) return;

        const selected = element.classList.contains('selected') 
            ? [...document.querySelectorAll('.selectable.selected')] 
            : [element];

        selected.forEach(el => {
            el.startPos = { 
                left: el.offsetLeft, 
                top: el.offsetTop 
            };
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