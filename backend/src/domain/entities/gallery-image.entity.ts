export class GalleryImage {
  id: string;
  url: string;
  deleteUrl?: string;
  name?: string;
  createdAt: Date;

  constructor(partial: Partial<GalleryImage>) {
    Object.assign(this, partial);
  }
}
