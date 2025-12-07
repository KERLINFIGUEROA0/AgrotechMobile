import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { Produccion } from '../producciones/entities/produccione.entity';
import { Gasto } from '../gastos_produccion/entities/gastos_produccion.entity';
import { PdfService } from '../pdf/pdf.service';
import { TipoMovimiento } from '../../common/enums/tipo-movimiento.enum';
import { Pago } from '../pagos/entities/pago.entity';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';

@Injectable()
export class VentasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Produccion)
    private readonly produccionRepository: Repository<Produccion>,
    @InjectRepository(Gasto)
    private readonly gastoRepository: Repository<Gasto>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly pdfService: PdfService,
  ) {}

  async create(dto: CreateVentaDto): Promise<Venta> {
    return this.dataSource.transaction(async (entityManager) => {
      const produccionRepo = entityManager.getRepository(Produccion);
      const ventaRepo = entityManager.getRepository(Venta);

      const produccion = await produccionRepo.findOne({
        where: { id: dto.produccionId },
        relations: ['cultivo'],
      });

      if (!produccion) {
        throw new NotFoundException(`La producción con ID ${dto.produccionId} no fue encontrada.`);
      }

      if (dto.cantidad > produccion.cantidad) {
        throw new BadRequestException(
          `No puedes vender ${dto.cantidad} kg. Cantidad disponible: ${produccion.cantidad} kg.`
        );
      }

      // Restamos la cantidad vendida de la cantidad disponible
      produccion.cantidad -= dto.cantidad;

      // Si la cantidad llega a 0, marcamos la producción como vendida
      if (produccion.cantidad === 0) {
        produccion.estado = 'Vendido';
      }

      // Mantenemos el cantidadOriginal como estaba
      if (!produccion.cantidadOriginal) {
        produccion.cantidadOriginal = produccion.cantidad + dto.cantidad;
      }
      
      await produccionRepo.save(produccion);

      const nuevaVenta = ventaRepo.create({
        descripcion: dto.descripcion || `Venta de ${produccion.cultivo?.nombre || 'producto'}`,
        fecha: dto.fecha,
        precioUnitario: dto.monto,
        cantidadVenta: dto.cantidad,
        valorTotalVenta: dto.monto * (dto.cantidad || 0),
        tipo: TipoMovimiento.INGRESO,
        produccion: produccion,
      });

      const ventaGuardada = await ventaRepo.save(nuevaVenta);
      
      const rutaPdf = await this.pdfService.generarFacturaPdf(ventaGuardada);
      ventaGuardada.rutaFacturaPdf = rutaPdf;
      
      return ventaRepo.save(ventaGuardada);
    });
  }

  async findAll(): Promise<any[]> {
    const ventas = await this.ventaRepository.find({
      relations: ['produccion', 'produccion.cultivo'],
      order: { fecha: 'DESC' },
    });

    return ventas.map(v => ({
      id: v.id,
      descripcion: v.descripcion || `Venta de ${v.produccion?.cultivo?.nombre || 'producto'}`,
      monto: parseFloat(v.valorTotalVenta as any),
      fecha: v.fecha,
      cantidad: v.cantidadVenta,
      unidadMedida: 'kg', // Las cosechas se venden por kilogramos
      precioUnitario: parseFloat(v.precioUnitario as any),
      tipo: v.tipo,
      rutaFacturaPdf: v.rutaFacturaPdf,
    }));
  }

  async findByProduccionIds(produccionIds: number[]): Promise<Venta[]> {
    if (produccionIds.length === 0) {
      return [];
    }
    return this.ventaRepository.find({
      where: {
        produccion: { id: In(produccionIds) },
      },
      relations: ['produccion'],
    });
  }

  async findFactura(id: number): Promise<string> {
    const venta = await this.ventaRepository.findOneBy({ id });
    if (!venta || !venta.rutaFacturaPdf) {
        throw new NotFoundException(`No se encontró una factura para la venta con ID ${id}.`);
    }
    if (!fs.existsSync(venta.rutaFacturaPdf)) {
        const rutaRegenerada = await this.pdfService.generarFacturaPdf(venta);
        venta.rutaFacturaPdf = rutaRegenerada;
        await this.ventaRepository.save(venta);
        return rutaRegenerada;
    }
    return venta.rutaFacturaPdf;
  }

  async getFlujoMensual() {
    const ingresosData: any[] = await this.ventaRepository.query(`
      SELECT
        TO_CHAR("Fecha", 'YYYY-MM') as mes,
        SUM("Valor_Total_Venta") as ingresos
      FROM ventas
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);

    const egresosData: any[] = await this.gastoRepository.query(`
      SELECT
        TO_CHAR("Fecha", 'YYYY-MM') as mes,
        SUM("Monto") as egresos
      FROM gastos
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 6;
    `);

    const combined: Record<string, { mes: string, ingresos: number, egresos: number }> = {};
    ingresosData.forEach(item => {
      combined[item.mes] = { mes: item.mes, ingresos: parseFloat(item.ingresos) || 0, egresos: 0 };
    });
    egresosData.forEach(item => {
      if (combined[item.mes]) {
        combined[item.mes].egresos = parseFloat(item.egresos) || 0;
      } else {
        combined[item.mes] = { mes: item.mes, ingresos: 0, egresos: parseFloat(item.egresos) || 0 };
      }
    });

    const result = Object.values(combined).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return result.map((item) => ({
      mes: monthNames[new Date(item.mes + '-02').getUTCMonth()],
      ingresos: item.ingresos,
      egresos: item.egresos
    }));
  }

  // --- 👇 CORRECCIÓN 5: Se añade el método 'remove' que faltaba ---
  async remove(id: number): Promise<void> {
    const venta = await this.ventaRepository.findOneBy({ id });
    if (!venta) {
      throw new NotFoundException(`La venta con ID ${id} no fue encontrada.`);
    }

    // Eliminar el archivo PDF si existe
    if (venta.rutaFacturaPdf && fs.existsSync(venta.rutaFacturaPdf)) {
      try {
        fs.unlinkSync(venta.rutaFacturaPdf);
      } catch (error) {
        console.error(`Error al eliminar el archivo PDF: ${error.message}`);
      }
    }

    await this.ventaRepository.delete(id);
  }

  async exportarTransaccionesExcel(): Promise<Buffer> {
    // Obtener todas las transacciones financieras
    const [ventas, gastos, pagos] = await Promise.all([
      this.ventaRepository.find({
        relations: ['produccion', 'produccion.cultivo'],
        order: { fecha: 'DESC' }
      }),
      this.gastoRepository.find({
        relations: ['cultivo'],
        order: { fecha: 'DESC' }
      }),
      this.pagoRepository.find({
        relations: ['usuario', 'actividad', 'actividad.cultivo'],
        order: { fechaPago: 'DESC' }
      })
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transacciones Financieras');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Cultivo', key: 'cultivo', width: 20 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Precio Unitario', key: 'precioUnitario', width: 15 },
      { header: 'Monto Total', key: 'montoTotal', width: 15 },
    ];

    // Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Agregar ingresos (ventas)
    ventas.forEach(venta => {
      worksheet.addRow({
        fecha: new Date(venta.fecha).toISOString().split('T')[0],
        tipo: 'Ingreso',
        descripcion: venta.descripcion || `Venta de ${venta.produccion?.cultivo?.nombre || 'producto'}`,
        cultivo: venta.produccion?.cultivo?.nombre || 'N/A',
        cantidad: venta.cantidadVenta,
        unidad: 'kg',
        precioUnitario: parseFloat(venta.precioUnitario as any),
        montoTotal: parseFloat(venta.valorTotalVenta as any)
      });
    });

    // Agregar egresos (gastos)
    gastos.forEach(gasto => {
      worksheet.addRow({
        fecha: new Date(gasto.fecha).toISOString().split('T')[0],
        tipo: 'Egreso',
        descripcion: gasto.descripcion,
        cultivo: gasto.cultivo?.nombre || 'General',
        cantidad: gasto.cantidad || 1,
        unidad: gasto.unidad || 'unidad',
        precioUnitario: gasto.precioUnitario || gasto.monto,
        montoTotal: gasto.monto
      });
    });

    // Agregar egresos (pagos)
    pagos.forEach(pago => {
      worksheet.addRow({
        fecha: new Date(pago.fechaPago).toISOString().split('T')[0],
        tipo: 'Egreso',
        descripcion: `Pago a ${pago.usuario?.nombre} ${pago.usuario?.apellidos} por actividad ${pago.actividad?.titulo}`,
        cultivo: pago.actividad?.cultivo?.nombre || 'N/A',
        cantidad: pago.horasTrabajadas,
        unidad: 'horas',
        precioUnitario: pago.tarifaHora,
        montoTotal: pago.monto
      });
    });

    // Aplicar formato de moneda a las columnas de precios
    const precioUnitarioCol = worksheet.getColumn('precioUnitario');
    const montoTotalCol = worksheet.getColumn('montoTotal');

    precioUnitarioCol.numFmt = '"$"#,##0.00';
    montoTotalCol.numFmt = '"$"#,##0.00';

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.width) {
        column.width = Math.max(column.width, 10);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}