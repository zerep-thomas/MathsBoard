/**
 * Gère la sélection et les interactions communes des éléments sur le board,
 * comme l'affichage des poignées de redimensionnement.
 */

export function initSelection(board) {
    let isSelecting = false;
    let selectionStartX, selectionStartY;
    let initiallySelected = new Set();
    const selectionRectangle = document.getElementById('selection-rectangle');

    const dispatchSelectionChangeEvent = (selectedElements) => {
        const event = new CustomEvent('selectionchange', {
            bubbles: true,
            detail: { selectedElements }
        });
        board.dispatchEvent(event);
    };
    
    // --- NOUVEAU : Gestion centralisée des poignées de redimensionnement ---
    board.addEventListener('selectionchange', (event) => {
        const { selectedElements } = event.detail;
        
        // Supprimer les anciennes poignées
        document.querySelectorAll('.resize-handle').forEach(h => h.remove());

        // Ajouter des poignées si un seul élément est sélectionné ET qu'il est redimensionnable
        if (selectedElements.length === 1 && selectedElements[0].dataset.fontSize) {
            const element = selectedElements[0];
            ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'].forEach(type => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${type}`;
                handle.addEventListener('mousedown', (e) => startResize(e, element, type));
                element.appendChild(handle);
            });
        }
    });

    board.addEventListener('mousedown', (e) => {
        if (e.target.closest('#operations-toolbar')) {
            return;
        }
        if (e.target.closest('.selectable') || e.button !== 0) return;
        if (!e.ctrlKey) deselectAll();

        isSelecting = true;
        initiallySelected = new Set(document.querySelectorAll('.selectable.selected'));
        
        selectionRectangle.style.display = 'block';
        const boardRect = board.getBoundingClientRect();
        selectionStartX = e.clientX - boardRect.left;
        selectionStartY = e.clientY - boardRect.top;
        Object.assign(selectionRectangle.style, { left: `${selectionStartX}px`, top: `${selectionStartY}px`, width: '0px', height: '0px' });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        const boardRect = board.getBoundingClientRect();
        const currentX = e.clientX - boardRect.left;
        const currentY = e.clientY - boardRect.top;
        const newX = Math.min(currentX, selectionStartX);
        const newY = Math.min(currentY, selectionStartY);
        const width = Math.abs(currentX - selectionStartX);
        const height = Math.abs(currentY - selectionStartY);
        Object.assign(selectionRectangle.style, { left: `${newX}px`, top: `${newY}px`, width: `${width}px`, height: `${height}px` });
        const rectBounds = selectionRectangle.getBoundingClientRect();
        document.querySelectorAll('.selectable').forEach(item => {
            const itemBounds = item.getBoundingClientRect();
            const isIntersecting = !(rectBounds.right < itemBounds.left || rectBounds.left > itemBounds.right || rectBounds.bottom < itemBounds.top || rectBounds.top > itemBounds.bottom);
            item.classList.toggle('selected', isIntersecting || initiallySelected.has(item));
        });
        dispatchSelectionChangeEvent(getSelectedElements());
    });

    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            initiallySelected.clear();
            selectionRectangle.style.display = 'none';
        }
    });

    const deselectAll = () => {
        document.querySelectorAll('.selectable.selected').forEach(m => m.classList.remove('selected'));
        dispatchSelectionChangeEvent([]);
    };

    const getSelectedElements = () => Array.from(document.querySelectorAll('.selectable.selected'));
    
    const setSelectedElements = (elementsToSelect) => {
        deselectAll();
        elementsToSelect.forEach(el => el.classList.add('selected'));
        dispatchSelectionChangeEvent(elementsToSelect);
    };

    return {
        deselectAll,
        getSelectedElements,
        setSelectedElements,
        refreshSelection: () => dispatchSelectionChangeEvent(getSelectedElements())
    };
}

/**
 * NOUVEAU : Démarre le processus de redimensionnement (logique générique).
 * @param {MouseEvent} e - L'événement mousedown.
 * @param {HTMLElement} element - L'élément à redimensionner.
 * @param {string} handleType - Le type de poignée utilisée.
 */
function startResize(e, element, handleType) {
    e.preventDefault();
    e.stopPropagation();

    const initialFontSize = parseFloat(element.dataset.fontSize);
    const initialRect = element.getBoundingClientRect();
    
    const onMouseMove = (moveEvent) => {
        let scale;
        if (handleType.includes('e') || handleType.includes('w')) {
            const dx = moveEvent.clientX - e.clientX;
            scale = (initialRect.width + (handleType.includes('w') ? -dx : dx)) / initialRect.width;
        } else {
            const dy = moveEvent.clientY - e.clientY;
            scale = (initialRect.height + (handleType.includes('n') ? -dy : dy)) / initialRect.height;
        }
        element.style.transform = `scale(${Math.max(0.1, scale)})`;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const finalRect = element.getBoundingClientRect();
        const finalScale = finalRect.width / initialRect.width;

        element.style.opacity = '0';
        element.style.transform = '';
        
        element.dataset.fontSize = initialFontSize * finalScale;
        
        const boardRect = document.getElementById('board').getBoundingClientRect();
        element.style.left = `${finalRect.left - boardRect.left}px`;
        element.style.top = `${finalRect.top - boardRect.top}px`;
        
        // Déclenche un événement pour que le module puisse se redessiner
        element.dispatchEvent(new CustomEvent('elementresize', { bubbles: true }));
        
        element.style.opacity = '1';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
}