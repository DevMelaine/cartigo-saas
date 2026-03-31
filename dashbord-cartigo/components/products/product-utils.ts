import type {
  Product,
  ProductOperationalStatus,
  ProductPerformanceIndicator,
} from "@/types/product";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

export function formatProductCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function createProductPlaceholder(label: string) {
  const safeLabel = label.trim().slice(0, 32) || "Cartigo";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
      <rect width="640" height="360" rx="32" fill="#F4F7F4"/>
      <circle cx="120" cy="120" r="52" fill="#E1F0E3"/>
      <circle cx="520" cy="250" r="84" fill="#E9F5EA"/>
      <rect x="72" y="214" width="272" height="18" rx="9" fill="#0F0F10" fill-opacity="0.10"/>
      <rect x="72" y="246" width="188" height="12" rx="6" fill="#0F0F10" fill-opacity="0.08"/>
      <text x="72" y="176" fill="#0F0F10" font-family="Arial, sans-serif" font-size="42" font-weight="700">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getProductPreviewUrl(previewUrl: string | null | undefined, label: string) {
  return previewUrl?.trim() || createProductPlaceholder(label);
}

export function getProductImageUrl(
  previewUrl: string | null | undefined,
  imageUrl: string | null | undefined,
  label: string
) {
  return previewUrl?.trim() || imageUrl?.trim() || createProductPlaceholder(label);
}

export function isLowStock(product: Pick<Product, "stock" | "lowStockThreshold">) {
  return (
    product.lowStockThreshold !== null &&
    product.lowStockThreshold !== undefined &&
    product.stock <= product.lowStockThreshold
  );
}

export function getPerformanceLabel(indicator: ProductPerformanceIndicator) {
  switch (indicator) {
    case "top":
      return "Top";
    case "steady":
      return "Stable";
    case "emerging":
      return "En progression";
    case "idle":
    default:
      return "Sans ventes";
  }
}

export function getPerformanceTone(indicator: ProductPerformanceIndicator) {
  switch (indicator) {
    case "top":
      return "border-primary/25 bg-primary/10 text-primary";
    case "steady":
      return "border-foreground/10 bg-foreground/5 text-foreground";
    case "emerging":
      return "border-primary/15 bg-primary/5 text-foreground";
    case "idle":
    default:
      return "border-border/70 bg-secondary text-muted-foreground";
  }
}

export function getProductStatusLabel(status: ProductOperationalStatus) {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "ACTIVE":
      return "Actif";
    case "PAUSED":
      return "En pause";
    case "ARCHIVED":
    default:
      return "Archive";
  }
}

export function getProductStatusDescription(status: ProductOperationalStatus) {
  switch (status) {
    case "DRAFT":
      return "Hors catalogue et non commandable";
    case "ACTIVE":
      return "Visible dans le catalogue et commandable";
    case "PAUSED":
      return "Masque temporairement, stock conserve";
    case "ARCHIVED":
    default:
      return "Retire du catalogue, restauration via brouillon";
  }
}

export function getProductStatusTone(status: ProductOperationalStatus) {
  switch (status) {
    case "DRAFT":
      return "border-border/70 bg-secondary text-secondary-foreground";
    case "ACTIVE":
      return "border-primary/20 bg-primary/10 text-primary";
    case "PAUSED":
      return "border-foreground/10 bg-foreground/5 text-foreground";
    case "ARCHIVED":
    default:
      return "border-border/70 bg-muted text-muted-foreground";
  }
}
