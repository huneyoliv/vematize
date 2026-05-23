import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleEntity } from '../entities/sale.orm-entity';

@Injectable()
export class SaleRepository {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly repo: Repository<SaleEntity>,
  ) {}

  async findAll(): Promise<SaleEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<SaleEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<SaleEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findByProductId(productId: string): Promise<SaleEntity[]> {
    return this.repo.find({ where: { productId }, order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<SaleEntity>): Promise<SaleEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<SaleEntity>): Promise<SaleEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async count(): Promise<number> {
    return this.repo.count();
  }

  async countByStatus(status: string): Promise<number> {
    return this.repo.count({ where: { status } });
  }

  async sumApprovedRevenue(): Promise<number> {
    console.log('[Debug] Calculando receita total de vendas aprovadas');
    const result = await this.repo
      .createQueryBuilder('sale')
      .select('COALESCE(SUM(sale.totalPrice), 0)', 'total')
      .where('sale.status = :status', { status: 'approved' })
      .getRawOne();
    console.log(`[Debug] Receita total calculada: ${result?.total}`);
    return parseFloat(result?.total || '0');
  }

  async findByPaymentId(paymentId: string): Promise<SaleEntity | null> {
    console.log(`[Debug] Buscando venda por paymentId: ${paymentId}`);
    return this.repo
      .createQueryBuilder('sale')
      .where('sale.paymentGateway = :gateway', { gateway: 'mercadopago' })
      .andWhere("sale.paymentDetails->>'paymentId' = :paymentId", { paymentId })
      .getOne();
  }

  async findByExternalReference(saleId: string): Promise<SaleEntity | null> {
    console.log(`[Debug] Buscando venda por ID externo: ${saleId}`);
    return this.repo.findOne({ where: { id: saleId } });
  }

  async findByTxid(txid: string): Promise<SaleEntity | null> {
    console.log(`[Debug] Buscando venda por txid: ${txid}`);
    return this.repo
      .createQueryBuilder('sale')
      .where('sale.paymentGateway = :gateway', { gateway: 'efi' })
      .andWhere("sale.paymentDetails->>'txid' = :txid", { txid })
      .getOne();
  }
}

