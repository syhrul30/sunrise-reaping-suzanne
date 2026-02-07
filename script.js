document.addEventListener('DOMContentLoaded', function() {
    
    // ================================================================
    // ============ INISIALISASI EFEK BACKGROUND (VANTA.JS) ===========
    // ================================================================
    // Efek Fog dipilih untuk merepresentasikan nuansa misterius/sunrise
    try {
        VANTA.FOG({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0xffd700, // Emas
            midtoneColor: 0x4b0082,   // Indigo/Ungu Gelap
            lowlightColor: 0x240046,  // Ungu Sangat Gelap
            baseColor: 0x000000,      // Hitam
            blurFactor: 0.6,
            speed: 1.2,
            zoom: 0.8
        });
    } catch (e) {
        console.warn("Vanta JS failed to load, falling back to CSS background.", e);
    }

    // DATA DUMMY (Tidak diubah, hanya contoh struktur)
    const articlesData = [
      {
            title: "Artikel Utama Pertama",
            original: [ "Ini adalah konten dari artikel dengan gaya utama atau standar." ],
            translation: [ "This is the content of an article with the main or standard style." ]
        },
        {
            title: "Artikel Sekunder 1.1",
            type: 'sub-article',
            original: [
                "Artikel ini independen, namun tampilannya dibuat berbeda (menjorok dan lebih kecil) karena memiliki penanda 'type'.",
                { text: 'Semua fitur seperti italic dan pop-up tetap berfungsi normal.', style: 'italic' },
                { type: 'image', src: 'https://placehold.co/600x400/e11d48/fff1f2?text=Gambar+Contoh', alt: 'Sebuah gambar contoh' }
            ],
            translation: [
                "This article is independent, but its appearance is made different (indented and smaller) because it has the 'type' flag.",
                "All features like italics and pop-ups still function normally.",
            ]
        },
        {
            title: "Artikel Sekunder 1.2",
            type: 'sub-article',
            original: [],
            translation: []
        },
        {
            title: "Artikel Utama Kedua",
            original: [],
            translation: []
        }
       ];

    /* */
  
    // --- ELEMEN HTML ---
    const articlesContainer = document.getElementById('articles-container');
    const popup = document.getElementById('translation-popup');
    const fontAdjusterToggle = document.getElementById('font-adjuster-toggle');
    const fontAdjusterContainer = document.getElementById('font-adjuster-container');
    const fontSizeSlider = document.getElementById('font-size-slider');
    
    const vocabToggleButton = document.getElementById('vocab-toggle-button');
    const vocabSidebar = document.getElementById('vocab-sidebar');
    const vocabList = document.getElementById('vocab-list');
    const clearVocabButton = document.getElementById('clear-vocab-button');

    const imagePreviewOverlay = document.getElementById('image-preview-overlay');
    const previewImage = document.getElementById('preview-image');
    const previewCloseButton = document.getElementById('preview-close-button');
    const zoomInButton = document.getElementById('zoom-in-button');
    const zoomOutButton = document.getElementById('zoom-out-button');
    const zoomResetButton = document.getElementById('zoom-reset-button');

    // ================================================================
    // ================ INISIALISASI & STATE MANAGEMENT ===============
    // ================================================================
    const savedFontSize = localStorage.getItem('fontSize') || '3';
     const savedActiveArticles = JSON.parse(localStorage.getItem('activeArticles')) || [];
     let vocabulary = JSON.parse(localStorage.getItem('vocabulary')) || [];
   let lastRead = JSON.parse(localStorage.getItem('lastRead')) || null;
   const currentBookTitle = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : 'Unknown Book';
 
     let currentScale = 1;
     let translateX = 0;
    let translateY = 0;
    let isPanning = false;
    let panStartX, panStartY;
    
    let currentlySelectedSegment = null;

    function applyFontSize(size) {
        for (let i = 1; i <= 5; i++) articlesContainer.classList.remove(`font-size-${i}`);
        articlesContainer.classList.add(`font-size-${size}`);
        fontSizeSlider.value = size;
    }
    applyFontSize(savedFontSize);

    // ================================================================
    // ================= LOGIKA INTI RENDER ARTIKEL ===================
    // ================================================================
    articlesData.forEach((articleData, articleIndex) => {
        const articleContainerEl = document.createElement('div');
        articleContainerEl.className = articleData.type === 'sub-article' ? 'article-container sub-article-container' : 'article-container';
        articleContainerEl.dataset.articleIndex = articleIndex; 

        if (savedActiveArticles.includes(articleIndex)) {
            articleContainerEl.classList.add('active');
        }

        const articleHeader = document.createElement('div');
        articleHeader.className = 'article-header';
        articleHeader.innerHTML = `<h3 class="font-bold">${articleData.title}</h3><div class="collapse-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div>`;

        const articleContent = document.createElement('div');
        articleContent.className = 'article-content';
        const contentInner = document.createElement('div');
        contentInner.className = 'article-content-inner';
        const textContainer = document.createElement('div');
        textContainer.className = 'text-lg leading-relaxed'; // text-slate-300 removed, handled by CSS
        
        const createParagraph = (contentArray) => { 
            if (contentArray.length === 0) return;
            const p = document.createElement('p');
            contentArray.forEach(item => {
                const span = document.createElement('span');
                span.textContent = item.text;
                span.dataset.articleIndex = item.articleIndex;
                span.dataset.segmentIndex = item.segmentIndex;
                span.classList.add('original-text-segment');
                if (item.style === 'italic') span.classList.add('italic');
                p.appendChild(span);
                p.append(' ');
            });
            textContainer.appendChild(p);
        };
        let paragraphContent = [];
        articleData.original.forEach((segment, segmentIndex) => {
            if (typeof segment === 'object' && segment !== null) {
                if (segment.type === 'image') {
                    createParagraph(paragraphContent);
                    paragraphContent = [];
                    const img = document.createElement('img');
                    img.src = segment.src;
                    img.alt = segment.alt || 'Gambar dalam artikel';
                    img.className = 'w-full h-auto rounded-xl my-4 shadow-lg';
                    
                    img.addEventListener('click', () => {
                        previewImage.src = img.src;
                        resetImageTransform();
                        imagePreviewOverlay.style.display = 'flex'; 
                        setTimeout(() => {
                            imagePreviewOverlay.classList.add('visible');
                        }, 10); 
                    });

                    textContainer.appendChild(img);
                } else if (segment.text) {
                    paragraphContent.push({ text: segment.text, style: segment.style || 'normal', articleIndex: articleIndex, segmentIndex: segmentIndex });
                }
            } else if (segment === "") {
                createParagraph(paragraphContent);
                paragraphContent = [];
            } else if (typeof segment === 'string' && segment.length > 0) {
                paragraphContent.push({ text: segment, style: 'normal', articleIndex: articleIndex, segmentIndex: segmentIndex });
            }
        });
        createParagraph(paragraphContent);

        contentInner.appendChild(textContainer);
        articleContent.appendChild(contentInner);
        
        articleContainerEl.appendChild(articleHeader);
        articleContainerEl.appendChild(articleContent);
        articlesContainer.appendChild(articleContainerEl);

        articleHeader.addEventListener('click', () => { 
            const isActive = articleContainerEl.classList.toggle('active');
            const currentActive = JSON.parse(localStorage.getItem('activeArticles')) || [];
            if (isActive) {
                if (!currentActive.includes(articleIndex)) currentActive.push(articleIndex);
            } else {
                const indexToRemove = currentActive.indexOf(articleIndex);
                if (indexToRemove > -1) currentActive.splice(indexToRemove, 1);
            }
            localStorage.setItem('activeArticles', JSON.stringify(currentActive));
            
            hidePopup();
            const previouslySelected = document.querySelector('.selected-text');
            if (previouslySelected) previouslySelected.classList.remove('selected-text');
        });
        
        articleContent.addEventListener('scroll', () => {
            if (currentlySelectedSegment && popup.classList.contains('visible')) {
                const scrollingArticleIndex = articleContent.parentElement.dataset.articleIndex;
                if (currentlySelectedSegment.dataset.articleIndex === scrollingArticleIndex) {
                    const rect = currentlySelectedSegment.getBoundingClientRect();
                    popup.style.top = `${window.scrollY + rect.bottom}px`;
                    popup.style.left = `${window.scrollX + rect.left}px`;
                }
            }
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.article-container').forEach(articleEl => observer.observe(articleEl));

    // ================================================================
    // ============== FUNGSI UNTUK PREVIEW GAMBAR =====================
    // ================================================================
    function applyImageTransform() {
        previewImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
        if (currentScale > 1) {
            previewImage.classList.add('pannable');
        } else {
            previewImage.classList.remove('pannable');
        }
    }
    
    function resetImageTransform() {
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        applyImageTransform();
    }

    function closeImagePreview() {
        imagePreviewOverlay.classList.remove('visible');
        setTimeout(() => {
            imagePreviewOverlay.style.display = 'none';
        }, 300);
    }

    // ================================================================
    // =================== LOGIKA POP-UP & BOOKMARK ===================
    // ================================================================
    function showPopup(target) {
        const articleIndex = target.dataset.articleIndex;
        const segmentIndex = target.dataset.segmentIndex;
        let originalSegment = articlesData[articleIndex].original[segmentIndex];
        let translationSegment = articlesData[articleIndex].translation[segmentIndex];
        
        if (typeof originalSegment === 'object') originalSegment = originalSegment.text;
        if (typeof translationSegment === 'object') translationSegment = translationSegment.text;
 
       // ============================================================
       // ============ LOGIKA V5.6: CROSS-BOOK SAFETY NET ============
       // ============================================================
       
       // 1. Safety Net: Cek apakah lastRead lama berasal dari buku lain
       if (lastRead && lastRead.bookTitle && lastRead.bookTitle !== currentBookTitle) {
           // Pindahkan lastRead lama ke vocabulary (Manual Save) agar tidak hilang
           const isDuplicate = vocabulary.some(item => item.original === lastRead.original);
           if (!isDuplicate) {
               vocabulary.unshift(lastRead);
               localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
           }
       }
 
       // 2. Update Last Read dengan segmen yang baru diklik
       lastRead = {
           original: originalSegment,
           translation: translationSegment,
           bookTitle: currentBookTitle, // PENTING: Judul buku saat ini
           title: articlesData[articleIndex].title, // Judul Chapter/Artikel
           articleIndex: articleIndex,
           segmentIndex: segmentIndex
       };
       localStorage.setItem('lastRead', JSON.stringify(lastRead));
       renderVocabulary(); // Re-render sidebar untuk update posisi Last Read
 
         if (!translationSegment) { hidePopup(); return; }
 
         const isAlreadyAdded = vocabulary.some(item => item.original === originalSegment);
        const addedClass = isAlreadyAdded ? 'added' : '';
        const buttonText = isAlreadyAdded ? '✔' : '+';

        popup.innerHTML = `
            <span>${translationSegment}</span>
            <button class="add-vocab-btn ${addedClass}" title="Tambah/Hapus Bookmark" data-original="${originalSegment}" data-translation="${translationSegment}" data-article-index="${articleIndex}" data-segment-index="${segmentIndex}">
                ${buttonText}
            </button>
        `;
        
        const rect = target.getBoundingClientRect();
        // Sedikit penyesuaian posisi agar tidak tertutup jari di mobile
        popup.style.top = `${window.scrollY + rect.bottom + 10}px`;
        popup.style.left = `${window.scrollX + rect.left}px`;
        popup.classList.add('visible');
        
        currentlySelectedSegment = target;
    }

    function hidePopup() {
        popup.classList.remove('visible');
        currentlySelectedSegment = null;
    }
    
    function renderVocabulary() {
         vocabList.innerHTML = ''; 
 
       // 1. Render ITEM TERAKHIR DIBACA (Auto-Save)
       if (lastRead && lastRead.bookTitle === currentBookTitle) {
           const lastReadItem = document.createElement('li');
           lastReadItem.className = 'vocab-item last-read';
           lastReadItem.dataset.articleIndex = lastRead.articleIndex;
           lastReadItem.dataset.segmentIndex = lastRead.segmentIndex;
           lastReadItem.dataset.type = 'last-read'; // Penanda khusus
           lastReadItem.innerHTML = `
               <div class="last-read-badge">TERAKHIR DIBACA</div>
               <div class="vocab-item-book">${lastRead.bookTitle}</div>
               <div class="vocab-item-original">${lastRead.original}</div>
               <div class="vocab-item-translation">${lastRead.translation}</div>
               <div class="vocab-item-source">Chapter: ${lastRead.title}</div>
           `;
           vocabList.appendChild(lastReadItem);
       }
 
       // 2. Render DIVIDER
       if (vocabulary.length > 0) {
           const divider = document.createElement('div');
           divider.className = 'vocab-divider';
           divider.textContent = 'TERSIMPAN MANUAL';
           vocabList.appendChild(divider);
       } else if (!lastRead) {
             vocabList.innerHTML = '<li class="empty-vocab-message">Belum ada catatan tribute.</li>';
             return;
         }
 
       // 3. Render LIST MANUAL (Vocabulary)
         vocabulary.forEach((item, index) => {
             const listItem = document.createElement('li');
             listItem.className = 'vocab-item';
             listItem.dataset.articleIndex = item.articleIndex;
             listItem.dataset.vocabIndex = index;
             listItem.dataset.segmentIndex = item.segmentIndex;
           listItem.dataset.bookTitle = item.bookTitle || 'Unknown Book'; // Simpan info buku di dataset
             listItem.innerHTML = `
               <div class="vocab-item-book">${item.bookTitle || 'Unknown Book'}</div>
                 <div class="vocab-item-original">${item.original}</div>
                 <div class="vocab-item-translation">${item.translation}</div>
                 <div class="vocab-item-source">Chapter: ${item.title}</div>
                <button class="delete-vocab-btn" title="Hapus Bookmark">&times;</button>
            `;
            vocabList.appendChild(listItem);
        });
    }

    function addVocabulary(original, translation, articleIndex, segmentIndex) {
        if (vocabulary.some(item => item.original === original)) {
            return;
        }
        vocabulary.unshift({
             original: original,
             translation: translation,
           bookTitle: currentBookTitle, // Tambahkan Judul Buku
             title: articlesData[articleIndex].title,
             articleIndex: articleIndex,
             segmentIndex: segmentIndex
        });
        localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
        renderVocabulary();
    }
    
    function removeVocabulary(originalText) {
        const indexToRemove = vocabulary.findIndex(item => item.original === originalText);
        if (indexToRemove > -1) {
            vocabulary.splice(indexToRemove, 1);
            localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
            renderVocabulary();
        }
    }
    
    renderVocabulary();

    // ================================================================
    // ===================== SEMUA EVENT LISTENER =====================
    // ================================================================
    
    articlesContainer.addEventListener('click', function(event) {
        const target = event.target;
        if (target.classList.contains('original-text-segment')) {
            const previouslySelected = document.querySelector('.selected-text');
            if (previouslySelected) previouslySelected.classList.remove('selected-text');
            if (previouslySelected === target) { 
                hidePopup(); 
                return; 
            }
            target.classList.add('selected-text');
            showPopup(target);
        }
    });
    
    popup.addEventListener('click', function(event){
        const target = event.target;
        if(target.classList.contains('add-vocab-btn')) {
            const originalText = target.dataset.original;

            if (target.classList.contains('added')) {
                if (confirm('Hapus catatan ini?')) {
                    removeVocabulary(originalText);
                    target.classList.remove('added');
                    target.textContent = '+';
                }
            } else {
                addVocabulary(
                    originalText, 
                    target.dataset.translation, 
                    target.dataset.articleIndex,
                    target.dataset.segmentIndex
                );
                target.classList.add('added');
                target.textContent = '✔';
            }
        }
    });

    vocabList.addEventListener('click', (event) => {
        const target = event.target;
        const vocabItem = target.closest('.vocab-item');
        if (!vocabItem) return;

        if (target.classList.contains('delete-vocab-btn')) {
            const vocabIndex = parseInt(vocabItem.dataset.vocabIndex);
            vocabulary.splice(vocabIndex, 1);
            localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
             renderVocabulary();
         } else {
           // Cek Cross-Book Logic
           let targetBookTitle = currentBookTitle; // Default
 
           // Jika item manual, ambil judul buku dari dataset (untuk last-read dianggap buku ini)
           if (!vocabItem.classList.contains('last-read')) {
               targetBookTitle = vocabItem.dataset.bookTitle;
           }
 
           // ALERT jika buku berbeda
             if (targetBookTitle !== currentBookTitle) {
               alert(`Punten kak, salah lho... 😅\nIni bookmark buat buku "${targetBookTitle}".\n\nYuk ganti buku dulu, biar ketemu halamannya! ✨`);
                 return; // Batalkan aksi scroll
             }
 
             const articleIndex = vocabItem.dataset.articleIndex;
             const segmentIndex = vocabItem.dataset.segmentIndex;
             const targetArticle = document.querySelector(`.article-container[data-article-index="${articleIndex}"]`);

            if (targetArticle) {
                if (!targetArticle.classList.contains('active')) {
                    targetArticle.classList.add('active');
                    const currentActive = JSON.parse(localStorage.getItem('activeArticles')) || [];
                    const numericArticleIndex = parseInt(articleIndex);
                    if (!currentActive.includes(numericArticleIndex)) {
                        currentActive.push(numericArticleIndex);
                        localStorage.setItem('activeArticles', JSON.stringify(currentActive));
                    }
                }

                setTimeout(() => {
                    const targetSegment = targetArticle.querySelector(`.original-text-segment[data-segment-index="${segmentIndex}"]`);
                    if (targetSegment) {
                        targetSegment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        targetSegment.classList.add('bookmark-highlight');
                        
                        setTimeout(() => {
                            targetSegment.classList.remove('bookmark-highlight');
                        }, 2400); 
                    }
                }, 300);
            }
            
            vocabSidebar.classList.remove('visible');
        }
    });

    document.addEventListener('click', function(event) {
        if (!event.target.closest('.article-container') && !event.target.closest('#translation-popup')) {
             hidePopup();
             const previouslySelected = document.querySelector('.selected-text');
             if (previouslySelected) previouslySelected.classList.remove('selected-text');
        }
        if (!event.target.closest('#font-adjuster-container') && !event.target.closest('#font-adjuster-toggle')) {
            fontAdjusterContainer.classList.remove('visible');
        }
        if (!event.target.closest('#vocab-sidebar') && !event.target.closest('#vocab-toggle-button')) {
            vocabSidebar.classList.remove('visible');
        }
    });

    const progressBar = document.getElementById('progress-bar');
    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        progressBar.style.width = `${(scrollTop / scrollHeight) * 100}%`;
    });

    // MENGHAPUS LOGIKA LAMA (MOUSEMOVE BLOB) KARENA SUDAH DIGANTI VANTA
    
    fontAdjusterToggle.addEventListener('click', () => fontAdjusterContainer.classList.toggle('visible'));
    fontSizeSlider.addEventListener('input', (e) => {
        applyFontSize(e.target.value);
        localStorage.setItem('fontSize', e.target.value);
    });

    vocabToggleButton.addEventListener('click', () => vocabSidebar.classList.toggle('visible'));
    clearVocabButton.addEventListener('click', () => { 
         if (confirm('Bakar semua catatan? (Hapus Semua)')) {
             vocabulary = [];
           lastRead = null; // Opsional: Hapus juga last read jika diinginkan, atau biarkan
             localStorage.removeItem('vocabulary');
           localStorage.removeItem('lastRead');
             renderVocabulary();
         }
      });

    previewCloseButton.addEventListener('click', closeImagePreview);
    zoomInButton.addEventListener('click', () => { currentScale += 0.2; applyImageTransform(); });
    zoomOutButton.addEventListener('click', () => { if (currentScale > 0.3) { currentScale -= 0.2; applyImageTransform(); } });
    zoomResetButton.addEventListener('click', resetImageTransform);

    previewImage.addEventListener('mousedown', (e) => {
        if (currentScale > 1) {
            e.preventDefault();
            isPanning = true;
            panStartX = e.clientX - translateX;
            panStartY = e.clientY - translateY;
            previewImage.classList.add('panning');
        }
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        previewImage.classList.remove('panning');
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            translateX = e.clientX - panStartX;
            translateY = e.clientY - panStartY;
            applyImageTransform();
        }
    });

    imagePreviewOverlay.addEventListener('click', (event) => {
        if (event.target === imagePreviewOverlay) {
            closeImagePreview();
        }
    });
});