// Adapter para banco de dados local (SQLite via Electron ou fallback JSON)
const { ipcRenderer } = window.require ? window.require('electron') : {};

class LocalAdapter {
  constructor() {
    this.isElectron = !!window.require;
    this.storageKey = 'team_treasury_data';
    
    if (!this.isElectron) {
      // Inicializar dados no localStorage se não existirem
      this.initLocalStorage();
    }
  }

  initLocalStorage() {
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const initialData = {
        members: [],
        payments: [],
        lastId: { members: 0, payments: 0 }
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  getLocalData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : { members: [], payments: [], lastId: { members: 0, payments: 0 } };
  }

  saveLocalData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async executeQuery(sql, params = []) {
    if (this.isElectron) {
      return await ipcRenderer.invoke('db-query', sql, params);
    } else {
      // Fallback para localStorage - implementação simplificada
      throw new Error('Query SQL não suportada no modo navegador. Use os métodos específicos.');
    }
  }

  async executeRun(sql, params = []) {
    if (this.isElectron) {
      return await ipcRenderer.invoke('db-run', sql, params);
    } else {
      throw new Error('Query SQL não suportada no modo navegador. Use os métodos específicos.');
    }
  }

  // MEMBERS
  async listMembers() {
    try {
      if (this.isElectron) {
        const result = await this.executeQuery('SELECT * FROM members ORDER BY name');
        return result.success ? result.data : [];
      } else {
        const data = this.getLocalData();
        return data.members;
      }
    } catch (error) {
      console.error('Erro ao listar sócios:', error);
      return [];
    }
  }

  async addMember(member) {
    try {
      if (this.isElectron) {
        const sql = `
          INSERT INTO members (name, phone, observation, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `;
        const result = await this.executeRun(sql, [member.name, member.phone, member.observation]);
        return result.success ? { id: result.data.lastInsertRowid, ...member } : null;
      } else {
        const data = this.getLocalData();
        const newId = data.lastId.members + 1;
        const newMember = {
          id: newId,
          ...member,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        data.members.push(newMember);
        data.lastId.members = newId;
        this.saveLocalData(data);
        return newMember;
      }
    } catch (error) {
      console.error('Erro ao adicionar sócio:', error);
      return null;
    }
  }

  async updateMember(id, member) {
    try {
      if (this.isElectron) {
        const sql = `
          UPDATE members 
          SET name = ?, phone = ?, observation = ?, updated_at = datetime('now')
          WHERE id = ?
        `;
        const result = await this.executeRun(sql, [member.name, member.phone, member.observation, id]);
        return result.success;
      } else {
        const data = this.getLocalData();
        const index = data.members.findIndex(m => m.id === id);
        if (index !== -1) {
          data.members[index] = {
            ...data.members[index],
            ...member,
            updated_at: new Date().toISOString()
          };
          this.saveLocalData(data);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Erro ao atualizar sócio:', error);
      return false;
    }
  }

  async deleteMember(id) {
    try {
      if (this.isElectron) {
        const sql = 'DELETE FROM members WHERE id = ?';
        const result = await this.executeRun(sql, [id]);
        return result.success;
      } else {
        const data = this.getLocalData();
        data.members = data.members.filter(m => m.id !== id);
        this.saveLocalData(data);
        return true;
      }
    } catch (error) {
      console.error('Erro ao deletar sócio:', error);
      return false;
    }
  }

  // PAYMENTS
  async listPayments(filters = {}) {
    try {
      if (this.isElectron) {
        let sql = 'SELECT * FROM payments WHERE 1=1';
        const params = [];

        if (filters.member_id) {
          sql += ' AND member_id = ?';
          params.push(filters.member_id);
        }

        if (filters.status) {
          sql += ' AND status = ?';
          params.push(filters.status);
        }

        if (filters.category) {
          sql += ' AND category = ?';
          params.push(filters.category);
        }

        if (filters.month) {
          sql += ' AND strftime("%Y-%m", due_date) = ?';
          params.push(filters.month);
        }

        sql += ' ORDER BY due_date DESC, created_at DESC';

        const result = await this.executeQuery(sql, params);
        return result.success ? result.data : [];
      } else {
        const data = this.getLocalData();
        let payments = [...data.payments];

        if (filters.member_id) {
          payments = payments.filter(p => p.member_id === filters.member_id);
        }

        if (filters.status) {
          payments = payments.filter(p => p.status === filters.status);
        }

        if (filters.category) {
          payments = payments.filter(p => p.category === filters.category);
        }

        if (filters.month) {
          payments = payments.filter(p => {
            if (!p.due_date) return false;
            const paymentMonth = p.due_date.substring(0, 7);
            return paymentMonth === filters.month;
          });
        }

        return payments.sort((a, b) => {
          const dateA = new Date(a.due_date || a.created_at);
          const dateB = new Date(b.due_date || b.created_at);
          return dateB - dateA;
        });
      }
    } catch (error) {
      console.error('Erro ao listar pagamentos:', error);
      return [];
    }
  }

  async addPayment(payment) {
    try {
      if (this.isElectron) {
        const sql = `
          INSERT INTO payments (member_id, amount, category, observation, due_date, paid_at, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        const result = await this.executeRun(sql, [
          payment.member_id,
          payment.amount,
          payment.category,
          payment.observation,
          payment.due_date,
          payment.paid_at,
          payment.status || 'pending'
        ]);
        return result.success ? { id: result.data.lastInsertRowid, ...payment } : null;
      } else {
        const data = this.getLocalData();
        const newId = data.lastId.payments + 1;
        const newPayment = {
          id: newId,
          ...payment,
          status: payment.status || 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        data.payments.push(newPayment);
        data.lastId.payments = newId;
        this.saveLocalData(data);
        return newPayment;
      }
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error);
      return null;
    }
  }

  async updatePayment(id, payment) {
    try {
      if (this.isElectron) {
        const sql = `
          UPDATE payments 
          SET member_id = ?, amount = ?, category = ?, observation = ?, due_date = ?, paid_at = ?, status = ?, updated_at = datetime('now')
          WHERE id = ?
        `;
        const result = await this.executeRun(sql, [
          payment.member_id,
          payment.amount,
          payment.category,
          payment.observation,
          payment.due_date,
          payment.paid_at,
          payment.status,
          id
        ]);
        return result.success;
      } else {
        const data = this.getLocalData();
        const index = data.payments.findIndex(p => p.id === id);
        if (index !== -1) {
          data.payments[index] = {
            ...data.payments[index],
            ...payment,
            updated_at: new Date().toISOString()
          };
          this.saveLocalData(data);
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      return false;
    }
  }

  async markPaid(paymentId) {
    try {
      const now = new Date().toISOString();
      return await this.updatePayment(paymentId, {
        paid_at: now,
        status: 'paid'
      });
    } catch (error) {
      console.error('Erro ao marcar pagamento como pago:', error);
      return false;
    }
  }

  async markPaidBulk(paymentIds) {
    try {
      const results = await Promise.all(
        paymentIds.map(id => this.markPaid(id))
      );
      return results.every(result => result);
    } catch (error) {
      console.error('Erro ao marcar pagamentos em lote:', error);
      return false;
    }
  }

  async deletePayment(id) {
    try {
      if (this.isElectron) {
        const sql = 'DELETE FROM payments WHERE id = ?';
        const result = await this.executeRun(sql, [id]);
        return result.success;
      } else {
        const data = this.getLocalData();
        data.payments = data.payments.filter(p => p.id !== id);
        this.saveLocalData(data);
        return true;
      }
    } catch (error) {
      console.error('Erro ao deletar pagamento:', error);
      return false;
    }
  }

  // BACKUP
  async exportBackup() {
    try {
      const members = await this.listMembers();
      const payments = await this.listPayments();
      
      const backup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          members,
          payments
        }
      };

      return backup;
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      return null;
    }
  }

  async importBackup(backupData) {
    try {
      if (this.isElectron) {
        // Para SQLite, seria necessário implementar transações
        // Por simplicidade, vamos apenas adicionar os dados
        console.warn('Importação de backup no Electron não implementada completamente');
        return false;
      } else {
        // Validar estrutura do backup
        if (!backupData.data || !backupData.data.members || !backupData.data.payments) {
          throw new Error('Estrutura de backup inválida');
        }

        const data = {
          members: backupData.data.members,
          payments: backupData.data.payments,
          lastId: {
            members: Math.max(...backupData.data.members.map(m => m.id), 0),
            payments: Math.max(...backupData.data.payments.map(p => p.id), 0)
          }
        };

        this.saveLocalData(data);
        return true;
      }
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      return false;
    }
  }
}

export default LocalAdapter;
