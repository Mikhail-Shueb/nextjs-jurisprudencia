export const updateTooltipPosition = (tooltipNode: HTMLElement, event: MouseEvent, containerId: string) => {
  const containerElement = document.getElementById(containerId);
  if (containerElement) {
    const containerRect = containerElement.getBoundingClientRect();

    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    const maxX = containerRect.width - tooltipWidth;
    const maxY = containerRect.height - tooltipHeight;

    const x = Math.min(
      Math.max(event.clientX - containerRect.left - tooltipWidth, 0),
      maxX
    );
    const y = Math.min(
      Math.max(event.clientY - containerRect.top - tooltipHeight, 0),
      maxY
    );
    tooltipNode.style.fontSize = '10px';  
    tooltipNode.style.left = `${x}px`;
    tooltipNode.style.top = `${y}px`;
    tooltipNode.style.opacity = '1';
  }
};

export function getTextWidth(text: string, fontSize: string = "9px"): number {
  if (typeof document === "undefined") return 0;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textElement.textContent = text;
  textElement.style.fontSize = fontSize;

  svg.appendChild(textElement);
  document.body.appendChild(svg);

  const width = textElement.getComputedTextLength();

  document.body.removeChild(svg);

  return width;
}
