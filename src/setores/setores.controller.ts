import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SetoresService } from './setores.service';
import { SetorResponseDto } from './dto/setor-response.dto';

@ApiTags('Setores e Bairros')
@Controller()
export class SetoresController {
  constructor(private readonly setoresService: SetoresService) {}

  @Get('setores')
  @ApiOperation({
    summary: 'Lista todos os 14 setores pastorais de Mossoró com seus respectivos bairros e total de cultos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de setores',
    type: [SetorResponseDto],
  })
  async findAll(): Promise<SetorResponseDto[]> {
    return this.setoresService.findAll();
  }

  @Get('setores/:numero')
  @ApiOperation({ summary: 'Obtém detalhes de um setor específico pelo seu número (1 a 14)' })
  @ApiParam({ name: 'numero', type: Number, example: 1, description: 'Número do setor' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do setor com seus bairros',
    type: SetorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async findByNumero(@Param('numero', ParseIntPipe) numero: number): Promise<SetorResponseDto> {
    return this.setoresService.findByNumero(numero);
  }

  @Get('bairros')
  @ApiOperation({ summary: 'Lista todos os bairros com suas coordenadas geográficas e vínculo de setor' })
  @ApiResponse({ status: 200, description: 'Lista de bairros ordenados alfabeticamente' })
  async findAllBairros() {
    return this.setoresService.findAllBairros();
  }
}
