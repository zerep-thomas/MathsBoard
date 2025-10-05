/**
 * Rend un élément déplaçable sur le tableau, y compris les sélections multiples.
 * @param {HTMLElement} element - L'élément à rendre déplaçable.
 */
export function makeDraggable(element) {
    element.addEventListener('mousedown', (e) => {
        // Ne pas démarrer le drag si on clique sur une poignée de redimensionnement
        // ou si la cible est un champ de saisie modifiable.
        if (e.button !== 0 || e.target.classList.contains('resize-handle') || e.target.tagName === 'TEXTAREA') return;

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