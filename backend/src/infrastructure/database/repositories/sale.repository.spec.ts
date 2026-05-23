import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleRepository } from './sale.repository';
import { SaleEntity } from '../entities/sale.orm-entity';

describe('SaleRepository', () => {
  let repository: SaleRepository;
  let ormRepo: Repository<SaleEntity>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaleRepository,
        {
          provide: getRepositoryToken(SaleEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<SaleRepository>(SaleRepository);
    ormRepo = module.get<Repository<SaleEntity>>(getRepositoryToken(SaleEntity));
  });

  it('deve calcular a soma da receita aprovada corretamente', async () => {
    mockQueryBuilder.getRawOne.mockResolvedValue({ total: '150.50' });

    const result = await repository.sumApprovedRevenue();

    expect(ormRepo.createQueryBuilder).toHaveBeenCalledWith('sale');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('COALESCE(SUM(sale.totalPrice), 0)', 'total');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('sale.status = :status', { status: 'approved' });
    expect(result).toBe(150.5);
  });

  it('deve buscar venda por paymentId do MercadoPago', async () => {
    const expectedSale = { id: 'sale-123', paymentGateway: 'mercadopago' };
    mockQueryBuilder.getOne.mockResolvedValue(expectedSale);

    const result = await repository.findByPaymentId('pay-999');

    expect(ormRepo.createQueryBuilder).toHaveBeenCalledWith('sale');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('sale.paymentGateway = :gateway', { gateway: 'mercadopago' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("sale.paymentDetails->>'paymentId' = :paymentId", { paymentId: 'pay-999' });
    expect(result).toEqual(expectedSale);
  });

  it('deve buscar venda por txid da Efi', async () => {
    const expectedSale = { id: 'sale-456', paymentGateway: 'efi' };
    mockQueryBuilder.getOne.mockResolvedValue(expectedSale);

    const result = await repository.findByTxid('tx-888');

    expect(ormRepo.createQueryBuilder).toHaveBeenCalledWith('sale');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('sale.paymentGateway = :gateway', { gateway: 'efi' });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("sale.paymentDetails->>'txid' = :txid", { txid: 'tx-888' });
    expect(result).toEqual(expectedSale);
  });

  it('deve buscar venda por ID externo', async () => {
    const expectedSale = { id: 'sale-789' };
    jest.spyOn(ormRepo, 'findOne').mockResolvedValue(expectedSale as any);

    const result = await repository.findByExternalReference('sale-789');

    expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'sale-789' } });
    expect(result).toEqual(expectedSale);
  });

  it('deve retornar venda aprovada para cupom + usuário já utilizados', async () => {
    const expectedSale = { id: 'sale-coupon', couponCode: 'DESC10', userId: 'user-1', status: 'approved' };
    jest.spyOn(ormRepo, 'findOne').mockResolvedValue(expectedSale as any);

    const result = await repository.findByCouponAndUser('DESC10', 'user-1');

    expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { couponCode: 'DESC10', userId: 'user-1', status: 'approved' } });
    expect(result).toEqual(expectedSale);
  });

  it('deve retornar null quando cupom não foi usado pelo usuário', async () => {
    jest.spyOn(ormRepo, 'findOne').mockResolvedValue(null);

    const result = await repository.findByCouponAndUser('DESC10', 'user-2');

    expect(result).toBeNull();
  });
});
