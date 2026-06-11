const defaultOpts = {
    fontSize: 16,
    color: '#000',
    opacity: 0.1,
    rotate: -20,   // 逆时针 20 度
    gapX: 200,
    gapY: 150,
    zIndex: 9999
};

function createWatermarkDataUrl(text, opts) {
    const { fontSize, color, opacity, rotate, gapX, gapY } = opts;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // 画布大小
    canvas.width = gapX + fontSize * text.length;
    canvas.height = gapY + fontSize;
    // 绘制文字
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((Math.PI / 180) * rotate);
    ctx.fillText(text, -canvas.width / 2 + 10, 0);
    // 导出为 Data URL
    return canvas.toDataURL('image/png');
}

function createWatermark(text, opts) {
    // 先移除已存在的全局水印
    removeWatermark();

    const dataUrl = createWatermarkDataUrl(text, opts);

    // 创建独立的水印div
    const watermarkDiv = document.createElement('div');
    watermarkDiv.id = 'global-watermark';
    watermarkDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        background-image: url(${dataUrl});
        background-repeat: repeat;
        z-index: ${opts.zIndex};
    `;

    // 将水印添加到body确保在最上层
    document.body.appendChild(watermarkDiv);
}

function removeWatermark() {
    const existingWatermark = document.getElementById('global-watermark');
    if (existingWatermark) {
        existingWatermark.remove();
    }
}

export default {
    mounted(el, binding) {
        const opts = Object.assign({}, defaultOpts, binding.value || {});
        // binding.value.text 为必需项
        if (!opts.text) {
            console.warn('[v-watermark] 需要传入 text，比如 v-watermark="{ text: \'nickname(username)\' }"');
            return;
        }
        createWatermark(opts.text, opts);
    },
    updated(el, binding) {
        const opts = Object.assign({}, defaultOpts, binding.value || {});
        if (!opts.text) return;
        createWatermark(opts.text, opts);
    },
    unmounted(el) {
        removeWatermark();
    }
};
