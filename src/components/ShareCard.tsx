import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

// 六维能力标签
const DIM_LABELS = {
  curiosity: '好奇心',
  reliability: '靠谱',
  factChecking: '事实洁癖',
  diverseThinking: '多元化思维',
  uncertaintyTolerance: '忍受不确定性',
  lowEgoHighDrive: '低ego高自驱',
} as const;

interface Portrait {
  curiosity: number;
  reliability: number;
  factChecking: number;
  diverseThinking: number;
  uncertaintyTolerance: number;
  lowEgoHighDrive: number;
}

interface ShareCardProps {
  userName: string;
  certLevel: string | null;
  certScore: number;
  portrait: Portrait;
  onClose: () => void;
}

// Canvas 绘制六维雷达图
function drawRadar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  labels: string[],
) {
  const sides = 6;
  const angles = Array.from(
    { length: sides },
    (_, i) => (Math.PI * 2 * i) / sides - Math.PI / 2,
  );

  // 绘制网格（3层）
  for (let level = 1; level <= 3; level++) {
    ctx.beginPath();
    const r = (radius * level) / 3;
    angles.forEach((angle, i) => {
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(201,100,66,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 绘制轴线
  angles.forEach((angle) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.strokeStyle = 'rgba(201,100,66,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 绘制数据区域
  ctx.beginPath();
  values.forEach((val, i) => {
    const r = (val / 100) * radius;
    const x = cx + Math.cos(angles[i]) * r;
    const y = cy + Math.sin(angles[i]) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(201,100,66,0.2)';
  ctx.fill();
  ctx.strokeStyle = '#c96442';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 绘制数据点
  values.forEach((val, i) => {
    const r = (val / 100) * radius;
    const x = cx + Math.cos(angles[i]) * r;
    const y = cy + Math.sin(angles[i]) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#c96442';
    ctx.fill();
  });

  // 绘制标签
  ctx.font = "20px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
  ctx.fillStyle = '#5e5d59';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labels.forEach((label, i) => {
    const x = cx + Math.cos(angles[i]) * (radius + 35);
    const y = cy + Math.sin(angles[i]) * (radius + 35);
    ctx.fillText(label, x, y);
  });
}

export default function ShareCard({
  userName,
  certLevel,
  certScore,
  portrait,
  onClose,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // 生成验证二维码
  useEffect(() => {
    const verifyUrl = `${window.location.origin}/profile`;
    QRCode.toDataURL(verifyUrl, {
      width: 260,
      margin: 1,
      color: { dark: '#141413', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080;
    const H = 1350;

    // 背景渐变
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, '#f5f4ed');
    bgGradient.addColorStop(1, '#faf9f5');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // 装饰：右上角几何圆环
    ctx.strokeStyle = 'rgba(201,100,66,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W - 120, 160, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W - 120, 160, 140, 0, Math.PI * 2);
    ctx.stroke();

    // 装饰：左下角实心小圆点矩阵
    ctx.fillStyle = 'rgba(217,119,87,0.25)';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.beginPath();
        ctx.arc(80 + col * 28, H - 200 + row * 28, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 顶部品牌色横条点缀
    ctx.fillStyle = '#c96442';
    ctx.fillRect(80, 90, 60, 4);

    // TalentX logo 文字
    ctx.font = "700 64px 'Playfair Display', Georgia, 'Times New Roman', serif";
    ctx.fillStyle = '#141413';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TalentX', 80, 170);

    // logo 副标题
    ctx.font = "400 22px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    ctx.fillText('能力认证 · Capability Certificate', 80, 205);

    // 用户名
    ctx.font = "700 48px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#141413';
    ctx.fillText(userName, 80, 300);

    // 认证等级徽章
    if (certLevel) {
      const badgeText = certLevel;
      ctx.font = "600 24px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
      const badgeWidth = ctx.measureText(badgeText).width + 48;
      const badgeX = 80;
      const badgeY = 330;
      const badgeH = 44;
      // 徽章圆角背景
      const radius = 22;
      ctx.beginPath();
      ctx.moveTo(badgeX + radius, badgeY);
      ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeH - radius);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeH, badgeX + badgeWidth - radius, badgeY + badgeH);
      ctx.lineTo(badgeX + radius, badgeY + badgeH);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
      ctx.lineTo(badgeX, badgeY + radius);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
      ctx.closePath();
      ctx.fillStyle = '#c96442';
      ctx.fill();
      // 徽章文字
      ctx.fillStyle = '#faf9f5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeH / 2 + 1);
    }

    // 重置对齐基准
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 分割线
    ctx.strokeStyle = 'rgba(94,93,89,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 420);
    ctx.lineTo(W - 80, 420);
    ctx.stroke();

    // 中间区域标题
    ctx.font = "500 24px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    ctx.fillText('六维能力画像', 80, 470);

    // 绘制雷达图
    const values = [
      portrait.curiosity,
      portrait.reliability,
      portrait.factChecking,
      portrait.diverseThinking,
      portrait.uncertaintyTolerance,
      portrait.lowEgoHighDrive,
    ];
    const labels = [
      DIM_LABELS.curiosity,
      DIM_LABELS.reliability,
      DIM_LABELS.factChecking,
      DIM_LABELS.diverseThinking,
      DIM_LABELS.uncertaintyTolerance,
      DIM_LABELS.lowEgoHighDrive,
    ];
    drawRadar(ctx, W / 2, 720, 200, values, labels);

    // 底部分割线
    ctx.strokeStyle = 'rgba(94,93,89,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 1000);
    ctx.lineTo(W - 80, 1000);
    ctx.stroke();

    // 综合分标签
    ctx.font = "500 22px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    ctx.fillText('综合评分', 80, 1060);

    // 综合分大数字
    ctx.font = "700 96px 'Playfair Display', Georgia, 'Times New Roman', serif";
    ctx.fillStyle = '#c96442';
    ctx.fillText(String(certScore), 80, 1160);

    // 分数单位
    ctx.font = "400 28px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    // 重新测量大数字宽度
    ctx.font = "700 96px 'Playfair Display', Georgia, 'Times New Roman', serif";
    const bigScoreWidth = ctx.measureText(String(certScore)).width;
    ctx.font = "400 28px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    ctx.fillText('/ 100', 80 + bigScoreWidth + 12, 1160);

    // 二维码区域（真实 QR 码）
    const qrSize = 130;
    const qrX = W - 80 - qrSize;
    const qrY = 1050;

    // 绘制真实二维码到 canvas
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      };
      qrImg.src = qrDataUrl;
    } else {
      // fallback：绘制占位框
      ctx.strokeStyle = '#e8e6dc';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX, qrY, qrSize, qrSize);
      ctx.fillStyle = '#87867f';
      ctx.font = "400 16px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('QR', qrX + qrSize / 2, qrY + qrSize / 2);
    }

    // 扫码提示文字
    ctx.font = "500 20px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#5e5d59';
    ctx.textAlign = 'right';
    ctx.fillText('扫码查看完整画像', W - 80, qrY + qrSize + 35);

    // 底部品牌水印
    ctx.textAlign = 'left';
    ctx.font = "400 18px 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    ctx.fillStyle = '#87867f';
    ctx.fillText('TalentX · 重新定义人才评估', 80, H - 60);
  }, [userName, certLevel, certScore, portrait, qrDataUrl]);

  // 下载分享卡片为 PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `talentx-${userName}-ability-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative flex max-h-[90vh] w-full max-w-[440px] flex-col items-center overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-[#5e5d59] transition-colors hover:bg-[#f5f4ed] hover:text-[#141413]"
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          {/* 标题 */}
          <div className="mb-4 flex items-center gap-2 self-start">
            <Share2 size={18} className="text-[#c96442]" />
            <span className="font-['DM_Sans'] text-sm font-medium text-[#5e5d59]">
              能力分享卡片
            </span>
          </div>

          {/* Canvas 预览 */}
          <canvas
            ref={canvasRef}
            width={1080}
            height={1350}
            className="w-full max-w-[400px] rounded-lg border border-[#e8e6dc] shadow-sm"
            style={{ aspectRatio: '1080 / 1350' }}
          />

          {/* 操作按钮 */}
          <div className="mt-5 flex w-full gap-3">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#c96442] px-4 py-3 font-['DM_Sans'] text-sm font-semibold text-white transition-colors hover:bg-[#d97757]"
            >
              <Download size={18} />
              保存图片
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#e8e6dc] px-4 py-3 font-['DM_Sans'] text-sm font-semibold text-[#5e5d59] transition-colors hover:bg-[#f5f4ed]"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
