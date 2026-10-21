import { Component, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly darkMode = signal(false);
  readonly isProductsPage = signal(this.router.url.startsWith('/products-list'));

  constructor() {
    this.setProductsPage(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.setProductsPage((event as NavigationEnd).urlAfterRedirects);
    });
  }

  private setProductsPage(url: string) {
    const isProductsPage = url.startsWith('/products-list');
    this.isProductsPage.set(isProductsPage);
    this.document.documentElement.classList.toggle('plain-products-page', isProductsPage);
  }

  toggleTheme() {
    this.darkMode.update((dark) => !dark);
    this.document.documentElement.classList.toggle('theme-dark', this.darkMode());
  }
}
