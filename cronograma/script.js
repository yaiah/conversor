const HOLIDAY_API_URL = 'https://date.nager.at/api/v3/PublicHolidays';
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const btnGerar = document.getElementById('gerar-cronograma');
    const btnAddAula = document.getElementById('adicionar-aula');
    const btnExportPDF = document.getElementById('exportar-pdf');
    const tabelaBody = document.getElementById('corpo-tabela');
   // const btnExportExcel = document.getElementById('exportar-excel');
document.getElementById('exportar-excel').addEventListener('click', function() {
    const incluirObjetivo = document.getElementById('incluir-objetivo').checked;
    let csv = 'Aula,Data,Conteúdo,Método\n'; // Cabeçalho padrão
    
    if (incluirObjetivo) {
        csv = 'Aula,Data,Conteúdo,Objetivo,Método\n';
    }

    document.querySelectorAll('#corpo-tabela tr').forEach(row => {
        const cells = row.querySelectorAll('input, textarea');
        let rowData = [
            `"${cells[0].value}"`, // Aula
            `"${cells[1].value}"`, // Data
            `"${cells[2].value}"`  // Conteúdo
        ];
        
        if (incluirObjetivo) {
            rowData.push(`"${cells[3].value}"`); // Objetivo
        }
        
        rowData.push(`"${cells[4].value}"`); // Método
        
        csv += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cronograma_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
    
    
    // Variáveis para drag and drop
    let draggedRow = null;

    // Função para auto-expansão dos textareas
    function setupAutoExpand() {
        document.querySelectorAll('.auto-expand').forEach(textarea => {
            // Ajustar altura inicial
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
            
            // Ajustar altura durante a digitação
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        });
    }

    // Função para verificar feriados
async function verificarFeriado(data, pais = 'BR') {
    try {
        const ano = data.getFullYear();
        const feriados = await getFeriadosAno(ano, pais);
        
        const dataStr = data.toISOString().split('T')[0];
        return feriados.some(feriado => feriado.date === dataStr);
    } catch (error) {
        console.error('Erro ao verificar feriados:', error);
        return false; // Fallback to local check if API fails
    }
}

// Cache for already fetched holidays
const holidayCache = {};

async function getFeriadosAno(ano, pais) {
    if (holidayCache[`${pais}-${ano}`]) {
        return holidayCache[`${pais}-${ano}`];
    }

    try {
        const response = await fetch(`${HOLIDAY_API_URL}/${ano}/${pais}`);
        if (!response.ok) throw new Error('API response not OK');
        
        const feriados = await response.json();
        holidayCache[`${pais}-${ano}`] = feriados;
        return feriados;
    } catch (error) {
        console.error('Erro ao buscar feriados:', error);
        
        // Fallback to local holidays if API fails
        const feriadosLocais = {
            'BR': [
                { date: `${ano}-01-01`, name: 'Ano Novo' },
                { date: `${ano}-04-21`, name: 'Tiradentes' },
                { date: `${ano}-05-01`, name: 'Dia do Trabalho' },
                { date: `${ano}-09-07`, name: 'Independência' },
                { date: `${ano}-10-12`, name: 'Nossa Senhora Aparecida' },
                { date: `${ano}-11-02`, name: 'Finados' },
                { date: `${ano}-11-15`, name: 'Proclamação da República' },
                { date: `${ano}-12-25`, name: 'Natal' }
            ]
        };
        
        return feriadosLocais[pais] || [];
    }
}

    // Função para renumerar aulas
    function renumeraAulas() {
        const linhas = tabelaBody.querySelectorAll('tr');
        linhas.forEach((linha, index) => {
            const inputNum = linha.querySelector('.input-aula');
            if (inputNum) inputNum.value = index + 1;
        });
    }

    // Função para adicionar linha (versão final)
    function adicionarLinha(numero, data, isFeriado = false) {
        const row = document.createElement('tr');
        row.setAttribute('draggable', 'true');
        if (isFeriado) row.classList.add('feriado');
        
         row.innerHTML = `
        <td><input type="number" value="${numero || ''}" class="yaia-input input-aula" min="1" max="999"></td>
        <td><input type="date" value="${data ? data.toISOString().split('T')[0] : ''}" class="yaia-input input-data"></td>
        <td>
            <div class="textarea-container">
                <textarea class="auto-expand input-conteudo">${isFeriado ? 'Feriado' : ''}</textarea>
            </div>
        </td>
        <td>
            <div class="textarea-container">
                <textarea class="auto-expand input-objetivo" placeholder="Opcional"></textarea>
            </div>
        </td>
        <td>
            <div class="textarea-container">
                <input type="text" class="yaia-input input-metodo" list="metodos-didaticos">
            </div>
        </td>
        <td><button class="yaia-button yaia-danger remover-aula">Remover</button></td>
    `;
        
        tabelaBody.appendChild(row);
        setupAutoExpand();
        
        // Configurar eventos
        const inputMetodo = row.querySelector('.input-metodo');
        inputMetodo.addEventListener('change', function() {
            row.classList.toggle('avaliacao', this.value === 'Avaliação');
        });
        
        row.querySelector('.remover-aula').addEventListener('click', function() {
            row.remove();
            renumeraAulas();
        });
        
        // Prevenir arrastar ao interagir com elementos internos
        row.querySelectorAll('input, textarea, button').forEach(el => {
            el.addEventListener('mousedown', (e) => e.stopPropagation());
        });
        
        return row;
    }

    // Inicialização do drag and drop
    function initDragAndDrop() {
        tabelaBody.addEventListener('dragstart', function(e) {
            if (e.target.tagName === 'TR') {
                draggedRow = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                document.body.classList.add('dragging-active');
            }
        });

        tabelaBody.addEventListener('dragover', function(e) {
            e.preventDefault();
            const targetRow = e.target.closest('tr');
            
            if (targetRow && targetRow !== draggedRow) {
                const rect = targetRow.getBoundingClientRect();
                const midPoint = rect.top + rect.height / 2;
                
                // Remove todas as classes de dropzone primeiro
                document.querySelectorAll('.dropzone, .dropzone-bottom').forEach(el => {
                    el.classList.remove('dropzone', 'dropzone-bottom');
                });
                
                // Adiciona a classe apropriada
                if (e.clientY < midPoint) {
                    targetRow.classList.add('dropzone');
                } else {
                    targetRow.classList.add('dropzone-bottom');
                }
            }
        });

        tabelaBody.addEventListener('dragleave', function(e) {
            const targetRow = e.target.closest('tr');
            if (targetRow) {
                targetRow.classList.remove('dropzone', 'dropzone-bottom');
            }
        });

        tabelaBody.addEventListener('drop', function(e) {
            e.preventDefault();
            const targetRow = e.target.closest('tr');
            
            if (targetRow && draggedRow) {
                // Remove classes de feedback visual
                document.body.classList.remove('dragging-active');
                draggedRow.classList.remove('dragging');
                targetRow.classList.remove('dropzone', 'dropzone-bottom');
                
                // Determina a posição para inserir
                const rect = targetRow.getBoundingClientRect();
                const shouldInsertBefore = e.clientY < (rect.top + rect.height / 2);
                
                // Move a linha
                if (shouldInsertBefore) {
                    tabelaBody.insertBefore(draggedRow, targetRow);
                } else {
                    tabelaBody.insertBefore(draggedRow, targetRow.nextSibling);
                }
                
                // Renumera as aulas
                renumeraAulas();
            }
        });

        tabelaBody.addEventListener('dragend', function() {
            document.body.classList.remove('dragging-active');
            if (draggedRow) {
                draggedRow.classList.remove('dragging');
            }
            // Remove todas as classes de dropzone
            document.querySelectorAll('.dropzone, .dropzone-bottom').forEach(el => {
                el.classList.remove('dropzone', 'dropzone-bottom');
            });
        });
    }

    // Função para gerar aulas
    async function gerarAulas(inicio, termino, periodicidade) {
    tabelaBody.innerHTML = '';
    let aulaNum = 1;
    let dataAtual = new Date(inicio);
    
    while (dataAtual <= termino) {
        const isFeriado = await verificarFeriado(dataAtual);
        adicionarLinha(aulaNum, dataAtual, isFeriado);
        
        if (periodicidade === 'semanal') {
            dataAtual.setDate(dataAtual.getDate() + 7);
        } else {
            dataAtual.setDate(dataAtual.getDate() + 14);
        }
        
        aulaNum++;
    }
}

    // Configuração dos event listeners
   btnGerar.addEventListener('click', async function() {
    const dataInicio = new Date(document.getElementById('data-inicio').value);
    const dataTermino = new Date(document.getElementById('data-termino').value);
    const periodicidade = document.getElementById('periodicidade').value;
    
    if (!dataInicio || !dataTermino) {
        alert('Por favor, informe as datas de início e término');
        return;
    }

    // Show loading state
    btnGerar.disabled = true;
    btnGerar.textContent = 'Carregando...';
    
    try {
        await gerarAulas(dataInicio, dataTermino, periodicidade);
    } catch (error) {
        console.error('Erro ao gerar aulas:', error);
        alert('Ocorreu um erro ao gerar o cronograma. Verifique o console para detalhes.');
    } finally {
        // Restore button state
        btnGerar.disabled = false;
        btnGerar.textContent = 'Gerar Cronograma';
    }
});

    btnAddAula.addEventListener('click', function() {
        adicionarLinha();
    });

    //btnExportPDF.addEventListener('click', function() {
    //    alert('Funcionalidade de exportação para PDF será implementada aqui');
        // Implementação real usaria bibliotecas como jsPDF
   // });

    btnExportExcel.addEventListener('click', function() {
        let csv = 'Aula,Data,Conteúdo,Objetivo,Método\n';
        
        document.querySelectorAll('#corpo-tabela tr').forEach(row => {
            const cells = row.querySelectorAll('input, textarea');
            const rowData = Array.from(cells).map(cell => {
                // Para textareas, usamos value, para inputs também
                return `"${cell.value.replace(/"/g, '""')}"`;
            });
            csv += rowData.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'cronograma_aulas.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Inicialização
    initDragAndDrop();
    setupAutoExpand();
    adicionarLinha(1, new Date()); // Adiciona uma linha inicial
});
// Configuração do PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm'
    });

    // Verifica se deve incluir objetivos
    const incluirObjetivo = document.getElementById('incluir-objetivo').checked;

    // Configurações de estilo aprimoradas
    const styles = {
        header: {
            fontSize: 18,
            bold: true,
            color: '#004d4d'
        },
        subheader: {
            fontSize: 12,
            color: '#555'
        },
        tableHeader: {
            fillColor: '#004d4d',
            textColor: '#ffffff',
            fontStyle: 'bold',
            fontSize: 10
        },
        defaultStyle: {
            textColor: '#000000',
            fillColor: '#ffffff',
            fontSize: 10
        },
        avaliacao: {
            textColor: '#d32f2f',
            fillColor: '#ffebee'
        },
        feriado: {
            textColor: '#388e3c',
            fillColor: '#e8f5e9'
        },
        campo: {
            textColor: '#5d4037',
            fillColor: '#efebe9'
        },
        alternateRow: {
            fillColor: '#f5f5f5'
        }
    };

    // Dados do cabeçalho
    const instituicao = document.getElementById('instituicao').value || 'Instituição não informada';
    const professor = document.getElementById('professor').value || 'Professor não informado';
    const disciplina = document.getElementById('disciplina').value || 'Disciplina não informada';
    const turma = document.getElementById('turma').value || 'Turma não informada';

    // Adiciona cabeçalho ao PDF
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(styles.header.color);
    doc.setFontSize(styles.header.fontSize);
    doc.text(instituicao, 15, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(styles.subheader.color);
    doc.setFontSize(styles.subheader.fontSize);
    doc.text(`Professor: ${professor}`, 15, 28);
    doc.text(`Disciplina: ${disciplina} - ${turma}`, 15, 34);

    // Configura colunas dinamicamente
    const headers = ['Aula', 'Data', 'Conteúdo', 'Método'];
    const columnStyles = {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: incluirObjetivo ? 40 : 70, halign: 'left' },
        3: { cellWidth: 30, halign: 'left' }
    };

    if (incluirObjetivo) {
        headers.splice(3, 0, 'Objetivo');
        columnStyles[3] = { cellWidth: 40, halign: 'left' };
        columnStyles[4] = { cellWidth: 30, halign: 'left' };
    }

    // Prepara os dados da tabela
    const rows = [];
    document.querySelectorAll('#corpo-tabela tr').forEach(row => {
        const cells = row.querySelectorAll('input, textarea');
        let rowData = [
            cells[0].value.trim() || '-', // Aula
            cells[1].value.trim() || '-', // Data
            cells[2].value.trim() || '-'  // Conteúdo
        ];
        
        if (incluirObjetivo) {
            rowData.push(cells[3].value.trim() || '-'); // Objetivo
        }
        
        const metodo = cells[4].value.trim().toLowerCase() || '-';
        rowData.push(metodo);

        // Determina o estilo baseado no conteúdo real
        let rowStyle = styles.defaultStyle;
        
        if (row.classList.contains('avaliacao') || metodo.includes('avaliação') || metodo.includes('avaliacao')) {
            rowStyle = { ...styles.defaultStyle, ...styles.avaliacao };
        } 
        else if (row.classList.contains('feriado') || rowData[2].toLowerCase().includes('feriado')) {
            rowStyle = { ...styles.defaultStyle, ...styles.feriado };
        }
        else if (metodo.includes('campo') || metodo.includes('externo') || metodo.includes('saída')) {
            rowStyle = { ...styles.defaultStyle, ...styles.campo };
        }
        
        rows.push({
            data: rowData,
            style: rowStyle
        });
    });

    // Configuração da tabela
    doc.autoTable({
        startY: 40,
        head: [headers],
        body: rows.map(row => row.data),
        headStyles: styles.tableHeader,
        styles: {
            cellPadding: 3,
            fontSize: 10,
            valign: 'middle',
            halign: 'left',
            minCellHeight: 8
        },
        columnStyles: columnStyles,
        willDrawCell: (data) => {
            const row = rows[data.row.index];
            if (row) {
                doc.setTextColor(row.style.textColor);
                doc.setFillColor(row.style.fillColor);
            }
        },
        didParseCell: (data) => {
            if (data.row.index >= 0 && rows[data.row.index]) {
                data.cell.styles.fillColor = rows[data.row.index].style.fillColor;
                if (data.row.index % 2 === 1 && 
                    rows[data.row.index].style.fillColor === styles.defaultStyle.fillColor) {
                    data.cell.styles.fillColor = styles.alternateRow.fillColor;
                }
            }
        },
        margin: { left: 15 },
        tableLineColor: '#e0e0e0',
        tableLineWidth: 0.1,
        showHead: 'everyPage',
        bodyLineColor: '#e0e0e0',
        headLineColor: '#004d4d',
        pageBreak: 'auto',
        tableWidth: 'wrap'
    });

    // Adiciona data e hora da exportação
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    doc.setFontSize(8);
    doc.setTextColor('#888');
    doc.text(`Gerado em: ${formattedDate} às ${formattedTime}`, 15, doc.internal.pageSize.height - 10);

    // Adiciona número de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#888');
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    // Salva o PDF
    const filename = `Cronograma_${disciplina.replace(/\s+/g, '_')}_${turma.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
}

// Conecta ao botão de exportação PDF com tratamento de erro
document.getElementById('exportar-pdf').addEventListener('click', function() {
    try {
        exportToPDF();
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
    }
});
