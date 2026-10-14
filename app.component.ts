import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Product,
  ProductRequest,
  ProductsService
} from './services/products.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  lookupId = '';
  products: Product[] = [];
  page = 1;
  pageSize = 10;
  totalPages = 0;
  totalItems = 0;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  modal: 'create' | 'edit' | 'detail' | 'stock' | null = null;
  selectedProduct: Product | null = null;

  form: ProductRequest = this.emptyForm();
  stockQuantity = 1;

  constructor(private productsService: ProductsService) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.productsService.getProducts(this.page, this.pageSize).subscribe({
      next: response => {
        this.products = response.items;
        this.page = response.page;
        this.pageSize = response.pageSize;
        this.totalPages = response.totalPages;
        this.totalItems = response.totalItems;
        this.loading = false;
      },
      error: error => {
        this.errorMessage = this.getError(error);
        this.loading = false;
      }
    });
  }

  openCreate(): void {
    this.selectedProduct = null;
    this.form = this.emptyForm();
    this.clearMessages();
    this.modal = 'create';
  }

  openEdit(product: Product): void {
    this.selectedProduct = product;
    this.form = {
      name: product.name,
      description: product.description,
      price: product.price
    };
    this.clearMessages();
    this.modal = 'edit';
  }

  openDetail(product: Product): void {
    this.selectedProduct = product;
    this.clearMessages();
    this.modal = 'detail';
  }

  openStock(product: Product): void {
    this.selectedProduct = product;
    this.stockQuantity = 1;
    this.clearMessages();
    this.modal = 'stock';
  }

  saveProduct(): void {
    if (this.saving) return;

    const name = this.form.name.trim();
    const price = Number(this.form.price);

    if (!name || name.length > 120) {
      this.errorMessage = 'El nombre es obligatorio y admite máximo 120 caracteres.';
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      this.errorMessage = 'El precio debe ser mayor que cero.';
      return;
    }

    if (this.form.description && this.form.description.length > 500) {
      this.errorMessage = 'La descripción admite máximo 500 caracteres.';
      return;
    }

    if (this.modal === 'create' &&
      (!Number.isInteger(this.form.stock) || Number(this.form.stock) < 0)) {
      this.errorMessage = 'El stock inicial debe ser un entero igual o mayor que cero.';
      return;
    }

    const payload: ProductRequest = {
      name,
      description: this.form.description?.trim() || null,
      price
    };

    this.saving = true;
    this.clearMessages();

    const request = this.modal === 'edit' && this.selectedProduct
      ? this.productsService.updateProduct(this.selectedProduct.id, payload)
      : this.productsService.createProduct({
        ...payload,
        stock: Number(this.form.stock)
      });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.modal = null;
        this.successMessage = this.selectedProduct
          ? 'Producto actualizado correctamente.'
          : 'Producto creado correctamente.';
        this.loadProducts();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getError(error);
      }
    });
  }

  saveStock(): void {
    if (!this.selectedProduct || this.saving) return;

    const quantity = Number(this.stockQuantity);

    if (!Number.isInteger(quantity) || quantity === 0) {
      this.errorMessage = 'Ingresa una cantidad entera distinta de cero.';
      return;
    }

    this.saving = true;
    this.clearMessages();

    this.productsService.adjustStock(this.selectedProduct.id, quantity).subscribe({
      next: product => {
        this.saving = false;
        this.modal = null;
        this.successMessage = `Stock actualizado. Existencias actuales: ${product.stock}.`;
        this.loadProducts();
      },
      error: error => {
        this.saving = false;
        this.errorMessage = this.getError(error);
      }
    });
  }

  deleteProduct(product: Product): void {
    const confirmed = confirm(
      `¿Eliminar "${product.name}"? Esta operación no se puede deshacer.`
    );

    if (!confirmed) return;

    this.clearMessages();

    this.productsService.deleteProduct(product.id).subscribe({
      next: () => {
        this.successMessage = 'Producto eliminado correctamente.';

        if (this.products.length === 1 && this.page > 1) {
          this.page--;
        }

        this.loadProducts();
      },
      error: error => {
        this.errorMessage = this.getError(error);
      }
    });
  }

  findById(id: string): void {
    const value = id.trim();
    if (!value) return;

    this.clearMessages();
    this.loading = true;

    this.productsService.getProduct(value).subscribe({
      next: product => {
        this.loading = false;
        this.openDetail(product);
      },
      error: error => {
        this.loading = false;
        this.errorMessage = this.getError(error);
      }
    });
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadProducts();
    }
  }

  closeModal(): void {
    this.modal = null;
    this.selectedProduct = null;
    this.clearMessages();
  }

  private emptyForm(): ProductRequest {
    return { name: '', description: '', price: 0, stock: 0 };
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con la API. Comprueba la conexión y la configuración CORS.';
    }

    const detail = error.error?.detail || error.error?.title;

    if (error.status === 400) return detail || 'Los datos enviados no son válidos.';
    if (error.status === 404) return detail || 'No se encontró el producto.';
    if (error.status === 409) return detail || 'El ajuste no es posible por las reglas de inventario.';
    if (error.status >= 500) return 'El servidor presentó un error. Revisa los registros de la API.';

    return detail || `La operación falló (HTTP ${error.status}).`;
  }

  getPageStock(): number {
    return this.products.reduce((sum, product) => sum + product.stock, 0);
  }

  getPageValue(): number {
    return this.products.reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    );
  }
}