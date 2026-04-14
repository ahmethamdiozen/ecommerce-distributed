export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    stock: number;
}
