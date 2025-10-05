/**
 * Gère l'affichage, la fermeture et l'initialisation des fenêtres modales.
 */

/**
 * Affiche une fenêtre modale en ajoutant la classe 'is-visible'.
 * @param {HTMLElement} modalElement - L'élément de la modale à afficher.
 */
export function showModal(modalElement) {
    if (modalElement) {
        modalElement.classList.add('is-visible');
    }
}

/**
 * Masque une fenêtre modale en retirant la classe 'is-visible'.
 * @param {HTMLElement} modalElement - L'élément de la modale à masquer.
 */
export function hideModal(modalElement) {
    if (modalElement) {
        modalElement.classList.remove('is-visible');
    }
}

/**
 * Initialise toutes les modales de la page pour qu'elles se ferment correctement.
 */
export function initUI() {
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        // Fermeture via le bouton 'close'
        const closeButton = modal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => hideModal(modal));
        }

        // Fermeture en cliquant sur le fond de la modale
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
}