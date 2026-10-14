import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductRequest {
  name: string;
  description: string | null;
  price: number;
  stock?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly apiUrl =
    'https://productinventory.sbtechgroup.com/api/products';

  constructor(private http: HttpClient) {}

  getProducts(page = 1, pageSize = 10): Observable<PagedResponse<Product>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<PagedResponse<Product>>(this.apiUrl, { params });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: ProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, data);
  }

  updateProduct(id: string, data: ProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, {
      name: data.name,
      description: data.description,
      price: data.price
    });
  }

  adjustStock(id: string, quantity: number): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}/stock`, {
      quantity
    });
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}