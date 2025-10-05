import { initUI } from './ui.js';
import { initSelection } from './selection.js';
import { initAI } from './ai.js';
import { initMatrixModule } from './modules/matrix.js';
import { initLatexModule } from './modules/latex.js';
import { initTextModule } from './modules/text.js';

/**
 * Point d'entrée principal de l'application.
 * S'exécute lorsque le DOM est entièrement chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments DOM principaux
    const board = document.getElementById('board');
    const toolbar = document.getElementById('toolbar');
    const operationsToolbar = document.getElementById('operations-toolbar');
    const copyLatexBtn = document.getElementById('copy-latex-btn');
    

    // 1. Initialisation des modules de base
    initUI();
    const selection = initSelection(board);
    initAI(board);

    // 2. Initialisation des modules d'outils (extensible)
    const modules = {
        matrix: initMatrixModule(board, selection),
        latex: initLatexModule(board, selection),
        text: initTextModule(board, selection),
    };
    
    // Logique de la barre de recherche d'outils ---
    const toolSearchInput = document.getElementById('tool-search-input');
    const tools = toolbar.querySelectorAll('.tool');
    

    toolSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        tools.forEach(tool => {
            const toolName = tool.textContent.toLowerCase();
            if (toolName.includes(searchTerm)) {
                tool.style.display = ''; // Affiche l'outil
            } else {
                tool.style.display = 'none'; // Masque l'outil
            }
        });
    });

    // Affiche ou masque le bouton en fonction de la sélection
    board.addEventListener('selectionchange', (e) => {
        const { selectedElements } = e.detail;
        // Vérifie si au moins un des éléments sélectionnés a du code LaTeX
        const hasLatexElement = selectedElements.some(el => el.dataset.latex);
        
        if (hasLatexElement) {
            copyLatexBtn.classList.remove('hidden');
        } else {
            copyLatexBtn.classList.add('hidden');
        }
    });

    copyLatexBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Empêche l'événement de se propager au 'board'.
    });


    // Gère le clic sur le bouton
    copyLatexBtn.addEventListener('click', () => {
        const selectedElements = selection.getSelectedElements();
    
        const latexElements = selectedElements
            .filter(el => el.dataset.latex)
            .sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return rectA.left - rectB.left;
            });
        const combinedLatex = latexElements
            .map(el => el.dataset.latex)
            .join(' ');
        if (combinedLatex) {
            navigator.clipboard.writeText(combinedLatex).then(() => {
                copyLatexBtn.textContent = 'Copié !';
                setTimeout(() => {
                    copyLatexBtn.textContent = 'Copier le LaTeX';
                }, 1500);
                
                try {
                    const confettiCanvas = document.getElementById('confetti-canvas');
                    if (confettiCanvas && typeof confetti === 'function') {
                        const myConfetti = confetti.create(confettiCanvas, {
                            resize: true,
                            useWorker: true
                        });
                        function fire(particleRatio, opts) {
                            myConfetti(Object.assign({}, {
                                origin: { y: 0.7 }
                            }, opts, {
                                particleCount: Math.floor(200 * particleRatio),
                                // Paramètres pour accélérer l'animation
                                gravity: 2,           // Augmente la gravité (défaut: 1)
                                decay: 0.88,          // Accélère la disparition (défaut: 0.9)
                                drift: 0,             // Réduit la dérive horizontale
                                ticks: 150            // Réduit la durée (défaut: 200)
                            }));
                        }
                        // Vélocités augmentées pour un effet plus rapide
                        fire(0.25, { spread: 26, startVelocity: 75 });
                        fire(0.2, { spread: 60, startVelocity: 65 });
                        fire(0.35, { spread: 100, startVelocity: 55, scalar: 0.8 });
                        fire(0.1, { spread: 120, startVelocity: 45, scalar: 1.2 });
                        fire(0.1, { spread: 120, startVelocity: 65 });
                    } else {
                        console.error("L'élément #confetti-canvas est introuvable. L'animation est annulée.");
                    }
                } catch (error) {
                    console.error("Une erreur s'est produite lors de l'animation des confettis:", error);
                }
            }).catch(err => {
                console.error('Erreur lors de la copie du LaTeX : ', err);
                alert("La copie a échoué.");
            });
        }
    });


    // 3. Gestion du glisser-déposer depuis la barre d'outils
    let draggedToolData = null;

    const handleDragStart = (e) => {
        const target = e.target;
        if (target.matches('.tool, .op-tool')) {
            draggedToolData = {
                type: target.dataset.toolType,
                content: target.dataset.latexContent || null // Récupère le symbole LaTeX s'il existe
            };
        }
    };

    toolbar.addEventListener('dragstart', handleDragStart);
    operationsToolbar.addEventListener('dragstart', handleDragStart); // Écoute sur la nouvelle barre

    board.addEventListener('dragover', (e) => e.preventDefault());

    board.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedToolData && modules[draggedToolData.type]) {
            // Passe les données (type et contenu) au module approprié
            modules[draggedToolData.type].handleDrop(e.clientX, e.clientY, {
                content: draggedToolData.content
            });
        }
        draggedToolData = null; // Réinitialise après le drop
    });

    // 4. Gestion des raccourcis clavier globaux
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        // Raccourci de suppression
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            const selectedElements = selection.getSelectedElements();
            selectedElements.forEach(el => el.remove());
            selection.refreshSelection(); 
        }

        // Raccourci de duplication
        if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const selectedElements = selection.getSelectedElements();
            if (selectedElements.length === 0) return;

            const newSelection = [];
            selectedElements.forEach(element => {
                const moduleType = element.dataset.module;
                if (moduleType && modules[moduleType] && modules[moduleType].handleDuplicate) {
                    const newElement = modules[moduleType].handleDuplicate(element);
                    if (newElement) {
                        newSelection.push(newElement);
                    }
                }
            });
            
            selection.setSelectedElements(newSelection);
        }
    });
});