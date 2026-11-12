/**
 * AMIGO SECRETO 2026 - Lógica Interactiva
 * Vanilla JS puro con persistencia en LocalStorage y partículas sutiles en azul.
 */

(() => {
  'use strict';

  // Lista exacta y ordenada de los 9 participantes
  const PARTICIPANTS = [
    'PAME',
    'FRAN',
    'GERARDO',
    'KARY',
    'SERGIO',
    'AGUSTIN',
    'MARCIA',
    'CAMILA',
    'CRISTOBAL'
  ];

  const STORAGE_KEY = 'amigo_secreto_2026_wishlist_v1';

  // Estado principal en memoria: { [nombreParticipante]: Array<{ id, name, description }> }
  let wishlistState = loadState();
  let lastAddedGiftId = null;

  // Referencias al DOM
  const gridEl = document.getElementById('participants-grid');
  const participantCountEl = document.getElementById('participant-count');
  const totalGiftsCountEl = document.getElementById('total-gifts-count');

  // Elementos del Modal de Regalo
  const giftModal = document.getElementById('gift-modal');
  const giftForm = document.getElementById('gift-form');
  const modalTitleEl = document.getElementById('modal-title');
  const modalParticipantTagEl = document.getElementById('modal-participant-name');
  const formParticipantInput = document.getElementById('form-participant');
  const formGiftIdInput = document.getElementById('form-gift-id');
  const giftNameInput = document.getElementById('gift-name');
  const giftDescInput = document.getElementById('gift-description');
  const giftNameErrorEl = document.getElementById('gift-name-error');

  // Elementos del Modal de Confirmación
  const confirmModal = document.getElementById('confirm-modal');

  // Botones globales
  const btnPrint = document.getElementById('btn-print');
  const btnClearAll = document.getElementById('btn-clear-all');

  /**
   * Inicializa o recupera los datos desde LocalStorage asegurando que existan los 9 participantes.
   */
  function loadState() {
    const initialState = {};
    PARTICIPANTS.forEach((name) => {
      initialState[name] = [];
    });

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialState;

      const parsed = JSON.parse(saved);
      PARTICIPANTS.forEach((name) => {
        if (Array.isArray(parsed[name])) {
          initialState[name] = parsed[name];
        }
      });
    } catch (error) {
      console.warn('No se pudo leer LocalStorage, iniciando estado vacío.', error);
    }

    return initialState;
  }

  /**
   * Guarda el estado actual en LocalStorage.
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistState));
    } catch (error) {
      console.error('Error al guardar en LocalStorage:', error);
    }
  }

  /**
   * Genera un identificador único para cada regalo.
   */
  function generateId() {
    return `gift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Escapa caracteres HTML para evitar inyección de código al renderizar textos del usuario.
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Actualiza los contadores superiores de participantes y regalos totales.
   */
  function updateCounters() {
    participantCountEl.textContent = `${PARTICIPANTS.length} personas`;

    const totalGifts = PARTICIPANTS.reduce(
      (sum, name) => sum + wishlistState[name].length,
      0
    );

    totalGiftsCountEl.textContent =
      totalGifts === 1 ? '1 regalo' : `${totalGifts} regalos`;
  }

  /**
   * Renderiza todas las tarjetas de los participantes en la cuadrícula.
   */
  function renderGrid() {
    gridEl.innerHTML = '';

    PARTICIPANTS.forEach((participant, index) => {
      const gifts = wishlistState[participant] || [];
      const card = document.createElement('article');
      card.className = 'participant-card';
      card.style.animationDelay = `${index * 0.06}s`;

      const giftCountText =
        gifts.length === 0
          ? 'Sin ideas aún'
          : gifts.length === 1
          ? '1 idea'
          : `${gifts.length} ideas`;

      const giftsContentHTML =
        gifts.length === 0
          ? `
            <div class="empty-state">
              <span aria-hidden="true">✦</span>
              <p>Aún no hay regalos agregados.<br>¡Agrega la primera idea!</p>
            </div>
          `
          : `
            <ul class="gifts-list">
              ${gifts
                .map((gift) => {
                  const isNewClass = gift.id === lastAddedGiftId ? 'gift-item--new' : '';
                  const descHTML = gift.description
                    ? `<p class="gift-desc">${escapeHTML(gift.description)}</p>`
                    : '';

                  return `
                    <li class="gift-item ${isNewClass}" data-gift-id="${gift.id}">
                      <div class="gift-info">
                        <div class="gift-title">${escapeHTML(gift.name)}</div>
                        ${descHTML}
                      </div>
                      <div class="gift-item-actions">
                        <button
                          type="button"
                          class="btn-mini btn-edit-gift"
                          data-participant="${participant}"
                          data-id="${gift.id}"
                          title="Editar regalo"
                          aria-label="Editar ${escapeHTML(gift.name)}"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          class="btn-mini btn-mini--delete btn-delete-gift"
                          data-participant="${participant}"
                          data-id="${gift.id}"
                          title="Eliminar regalo"
                          aria-label="Eliminar ${escapeHTML(gift.name)}"
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  `;
                })
                .join('')}
            </ul>
          `;

      card.innerHTML = `
        <header class="card-header">
          <h2 class="participant-name">${participant}</h2>
          <div class="gift-badge-icon" aria-hidden="true">🎁</div>
        </header>

        <div class="card-body">
          <div class="wishlist-prompt">
            <span>¿Qué me gustaría recibir?</span>
            <span class="gift-counter-tag">${giftCountText}</span>
          </div>

          ${giftsContentHTML}

          <button
            type="button"
            class="btn-add-gift"
            data-participant="${participant}"
          >
            <span aria-hidden="true">＋</span>
            <span>Agregar regalo</span>
          </button>
        </div>
      `;

      gridEl.appendChild(card);
    });

    lastAddedGiftId = null;
    updateCounters();
  }

  /**
   * Abre el modal para agregar un nuevo regalo o editar uno existente.
   */
  function openGiftModal(participant, giftToEdit = null) {
    giftNameErrorEl.textContent = '';
    formParticipantInput.value = participant;
    modalParticipantTagEl.textContent = `PARA: ${participant}`;

    if (giftToEdit) {
      modalTitleEl.textContent = 'Editar idea de regalo';
      formGiftIdInput.value = giftToEdit.id;
      giftNameInput.value = giftToEdit.name;
      giftDescInput.value = giftToEdit.description || '';
    } else {
      modalTitleEl.textContent = 'Agregar idea de regalo';
      formGiftIdInput.value = '';
      giftNameInput.value = '';
      giftDescInput.value = '';
    }

    giftModal.hidden = false;
    setTimeout(() => giftNameInput.focus(), 50);
  }

  /**
   * Cierra el modal de regalo.
   */
  function closeGiftModal() {
    giftModal.hidden = true;
    giftForm.reset();
    giftNameErrorEl.textContent = '';
  }

  /**
   * Maneja el guardado (creación o edición) de un regalo.
   */
  function handleFormSubmit(event) {
    event.preventDefault();

    const participant = formParticipantInput.value;
    const giftId = formGiftIdInput.value;
    const name = giftNameInput.value.trim();
    const description = giftDescInput.value.trim();

    if (!name) {
      giftNameErrorEl.textContent = 'Por favor escribe el nombre del regalo.';
      giftNameInput.focus();
      return;
    }

    if (!PARTICIPANTS.includes(participant)) return;

    if (giftId) {
      const list = wishlistState[participant];
      const targetIndex = list.findIndex((item) => item.id === giftId);
      if (targetIndex !== -1) {
        list[targetIndex] = {
          ...list[targetIndex],
          name,
          description
        };
        lastAddedGiftId = giftId;
      }
    } else {
      const newGift = {
        id: generateId(),
        name,
        description
      };
      wishlistState[participant].push(newGift);
      lastAddedGiftId = newGift.id;
    }

    saveState();
    renderGrid();
    closeGiftModal();
  }

  /**
   * Elimina un regalo específico de un participante.
   */
  function deleteGift(participant, giftId) {
    if (!wishlistState[participant]) return;
    wishlistState[participant] = wishlistState[participant].filter(
      (item) => item.id !== giftId
    );
    saveState();
    renderGrid();
  }

  /**
   * Limpia todos los regalos de todos los participantes.
   */
  function clearAllGifts() {
    PARTICIPANTS.forEach((name) => {
      wishlistState[name] = [];
    });
    saveState();
    renderGrid();
    confirmModal.hidden = true;
  }

  /* ==========================================================================
     EVENT LISTENERS
     ========================================================================== */

  gridEl.addEventListener('click', (event) => {
    const addBtn = event.target.closest('.btn-add-gift');
    if (addBtn) {
      openGiftModal(addBtn.dataset.participant);
      return;
    }

    const editBtn = event.target.closest('.btn-edit-gift');
    if (editBtn) {
      const { participant, id } = editBtn.dataset;
      const gift = wishlistState[participant]?.find((item) => item.id === id);
      if (gift) openGiftModal(participant, gift);
      return;
    }

    const deleteBtn = event.target.closest('.btn-delete-gift');
    if (deleteBtn) {
      const { participant, id } = deleteBtn.dataset;
      deleteGift(participant, id);
    }
  });

  giftForm.addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-close-modal').addEventListener('click', closeGiftModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeGiftModal);

  giftModal.addEventListener('click', (event) => {
    if (event.target === giftModal) closeGiftModal();
  });

  btnClearAll.addEventListener('click', () => {
    const totalGifts = PARTICIPANTS.reduce(
      (sum, name) => sum + wishlistState[name].length,
      0
    );
    if (totalGifts === 0) return;
    confirmModal.hidden = false;
  });

  document.getElementById('btn-close-confirm').addEventListener('click', () => {
    confirmModal.hidden = true;
  });

  document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
    confirmModal.hidden = true;
  });

  document.getElementById('btn-execute-clear').addEventListener('click', clearAllGifts);

  confirmModal.addEventListener('click', (event) => {
    if (event.target === confirmModal) confirmModal.hidden = true;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!giftModal.hidden) closeGiftModal();
      if (!confirmModal.hidden) confirmModal.hidden = true;
    }
  });

  btnPrint.addEventListener('click', () => {
    window.print();
  });

  /* ==========================================================================
     EFECTO SUTIL DE DESTELLOS AZUL CIELO EN CANVAS
     ========================================================================== */
  function initSnowfall() {
    const canvas = document.getElementById('snow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const flakeCount = Math.min(55, Math.floor(width / 24));
    const flakes = Array.from({ length: flakeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1.1,
      speedY: Math.random() * 0.55 + 0.2,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.2
    }));

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    function animate() {
      ctx.clearRect(0, 0, width, height);

      flakes.forEach((flake) => {
        flake.y += flake.speedY;
        flake.x += flake.speedX;

        if (flake.y > height) {
          flake.y = -5;
          flake.x = Math.random() * width;
        }
        if (flake.x > width) flake.x = 0;
        if (flake.x < 0) flake.x = width;

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96, 150, 186, ${flake.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  // Inicialización de la aplicación
  renderGrid();
  initSnowfall();
})();