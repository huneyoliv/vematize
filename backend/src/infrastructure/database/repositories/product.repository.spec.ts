import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductRepository } from './product.repository';
import { ProductEntity } from '../entities/product.orm-entity';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let ormRepo: Repository<ProductEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'prod-123', ...entity })),
            findOne: jest.fn(),
            merge: jest.fn().mockImplementation((existing, dto) => ({ ...existing, ...dto })),
          },
        },
      ],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
    ormRepo = module.get<Repository<ProductEntity>>(getRepositoryToken(ProductEntity));
  });

  it('deve sincronizar o estoque com o tamanho das chaves de ativação ao criar produto de entrega automática', async () => {
    const data = {
      name: 'Produto Auto',
      price: 10,
      type: 'product' as const,
      productSubtype: 'activation_codes',
      activationCodes: ['key-1', 'key-2', 'key-3'],
    };

    const result = await repository.create(data);

    expect(ormRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      stock: 3,
    }));
    expect(result.stock).toBe(3);
  });

  it('deve definir o estoque como 0 se chaves de ativação forem nulas/vazias ao criar', async () => {
    const data = {
      name: 'Produto Auto Vazio',
      price: 10,
      type: 'product' as const,
      productSubtype: 'activation_codes',
      activationCodes: [],
    };

    const result = await repository.create(data);

    expect(ormRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      stock: 0,
    }));
    expect(result.stock).toBe(0);
  });

  it('deve sincronizar o estoque com o tamanho das chaves de ativação ao atualizar produto de entrega automática', async () => {
    const existingProduct = {
      id: 'prod-123',
      name: 'Produto Antigo',
      price: 10,
      productSubtype: 'activation_codes',
      activationCodes: ['key-1'],
      stock: 1,
    };

    jest.spyOn(repository, 'findById').mockResolvedValue(existingProduct as any);

    const updateData = {
      activationCodes: ['key-1', 'key-2', 'key-3', 'key-4'],
    };

    const result = await repository.update('prod-123', updateData as any);

    expect(ormRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      stock: 4,
      activationCodes: ['key-1', 'key-2', 'key-3', 'key-4'],
    }));
    expect(result?.stock).toBe(4);
  });

  it('deve limpar chaves de ativação se produto for alterado de entrega automática para padrão', async () => {
    const existingProduct = {
      id: 'prod-123',
      name: 'Produto Antigo',
      price: 10,
      productSubtype: 'activation_codes',
      activationCodes: ['key-1'],
      stock: 1,
    };

    jest.spyOn(repository, 'findById').mockResolvedValue(existingProduct as any);

    const updateData = {
      productSubtype: 'standard',
      stock: 10,
    };

    const result = await repository.update('prod-123', updateData as any);

    expect(ormRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      productSubtype: 'standard',
      stock: 10,
      activationCodes: [],
      activationCodesUsed: [],
    }));
    expect(result?.stock).toBe(10);
  });
});
