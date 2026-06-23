class Other {
  _drawLine(ctx, p, priceMin, priceMax) {
    ctx.save();
    ctx.strokeStyle = this.options.colors.line;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawArea(ctx, p, priceMin, priceMax) {
    ctx.save();
    const baseY = p.h;
    ctx.beginPath();
    let started = false;
    let firstX, lastX;
    for (
      let i = this.viewStart;
      i < this.viewEnd && i < this.data.length;
      i++
    ) {
      const x = this._xOf(i);
      const y = this._yOf(this.data[i].c, p, priceMin, priceMax);
      if (!started) {
        ctx.moveTo(x, y);
        firstX = x;
        started = true;
      } else ctx.lineTo(x, y);
      lastX = x;
    }
    if (started) {
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(firstX, baseY);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, p.h);
      grad.addColorStop(0, this.options.colors.area1);
      grad.addColorStop(1, this.options.colors.area2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }
}
