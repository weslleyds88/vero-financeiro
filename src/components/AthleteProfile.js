import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AthleteProfile = ({ currentUser, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    rg: '',
    region: '',
    gender: '',
    position: '',
    responsible_name: '',
    responsible_phone: '',
    avatar_url: '',
    observation: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        birth_date: currentUser.birth_date || '',
        rg: currentUser.rg || '',
        region: currentUser.region || '',
        gender: currentUser.gender || '',
        position: currentUser.position || '',
        responsible_name: currentUser.responsible_name || '',
        responsible_phone: currentUser.responsible_phone || '',
        avatar_url: currentUser.avatar_url || '',
        observation: currentUser.observation || ''
      });
      setAvatarPreview(currentUser.avatar_url || '');
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatar_url: 'Arquivo deve ser uma imagem' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      setErrors(prev => ({ ...prev, avatar_url: 'Imagem deve ter no máximo 2MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData(prev => ({ ...prev, avatar_url: base64String }));
      setAvatarPreview(base64String);
      setErrors(prev => ({ ...prev, avatar_url: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome é obrigatório';
    }

    if (formData.phone && !/^(\d{2}\s?)?\d{4,5}-?\d{4}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Formato de telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
          rg: formData.rg || null,
          region: formData.region || null,
          gender: formData.gender || null,
          position: formData.position || null,
          responsible_name: formData.responsible_name || null,
          responsible_phone: formData.responsible_phone || null,
          avatar_url: formData.avatar_url || null,
          observation: formData.observation || null
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setSuccessMessage('Perfil atualizado com sucesso!');
      setIsEditing(false);
      if (onUpdate) onUpdate();
      
      // Atualizar o currentUser no contexto seria feito pelo componente pai
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setErrors({ submit: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      // Verificar se está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Atualizar senha diretamente (usuário já está autenticado)
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      // Se o usuário tinha must_change_password, remover o flag
      if (currentUser?.must_change_password) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', currentUser.id);
        
        if (profileError) {
          console.error('Erro ao remover flag must_change_password:', profileError);
          // Não falhar a operação, apenas logar o erro
        }
      }

      setSuccessMessage('Senha alterada com sucesso!');
      setIsChangingPassword(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      
      // Recarregar dados do usuário após trocar senha
      if (onUpdate) {
        onUpdate();
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setErrors({ password: error.message || 'Erro ao alterar senha' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
          {!isEditing && !isChangingPassword && (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Editar Perfil
              </button>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Alterar Senha
              </button>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {errors.submit}
          </div>
        )}

        {isChangingPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Alterar Senha</h3>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
              💡 Você está autenticado, então não precisa informar sua senha atual. 
              Basta definir uma nova senha.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha *
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 border rounded-lg ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">A senha deve ter no mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className={`w-full px-3 py-2 border rounded-lg ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Digite a senha novamente"
                required
                minLength={6}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.password && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {errors.password}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Senha'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ newPassword: '', confirmPassword: '' });
                  setErrors({});
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto de Perfil
                </label>
                <div className="flex items-center space-x-4">
                  {avatarPreview && (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-sm"
                  />
                </div>
                {errors.avatar_url && (
                  <p className="mt-1 text-sm text-red-600">{errors.avatar_url}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">Email não pode ser alterado</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className={`w-full px-3 py-2 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RG
                </label>
                <input
                  type="text"
                  name="rg"
                  value={formData.rg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Região
                </label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gênero
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecione...</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posição
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Selecione...</option>
                  <option value="Ponteiro">Ponteiro</option>
                  <option value="Oposto">Oposto</option>
                  <option value="Central">Central</option>
                  <option value="Levantador">Levantador</option>
                  <option value="Líbero">Líbero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  name="responsible_name"
                  value={formData.responsible_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone do Responsável
                </label>
                <input
                  type="text"
                  name="responsible_phone"
                  value={formData.responsible_phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observation"
                  value={formData.observation}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Observações gerais sobre o perfil (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Este campo pode ser usado para notas gerais sobre o perfil
                </p>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  if (currentUser) {
                    setFormData({
                      full_name: currentUser.full_name || '',
                      email: currentUser.email || '',
                      phone: currentUser.phone || '',
                      birth_date: currentUser.birth_date || '',
                      rg: currentUser.rg || '',
                      region: currentUser.region || '',
                      gender: currentUser.gender || '',
                      position: currentUser.position || '',
                      responsible_name: currentUser.responsible_name || '',
                      responsible_phone: currentUser.responsible_phone || '',
                      avatar_url: currentUser.avatar_url || '',
                      observation: currentUser.observation || ''
                    });
                    setAvatarPreview(currentUser.avatar_url || '');
                  }
                  setErrors({});
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt={formData.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-300"
                />
              ) : (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-300">
                  <span className="text-blue-600 font-bold text-3xl">
                    {formData.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{formData.full_name}</h3>
                <p className="text-gray-600">{formData.email}</p>
                {formData.position && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {formData.position}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Informações Pessoais</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Telefone:</span>
                    <span className="ml-2 text-gray-900">{formData.phone || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Data de Nascimento:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.birth_date ? new Date(formData.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">RG:</span>
                    <span className="ml-2 text-gray-900">{formData.rg || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Região:</span>
                    <span className="ml-2 text-gray-900">{formData.region || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Gênero:</span>
                    <span className="ml-2 text-gray-900">
                      {formData.gender === 'male' ? 'Masculino' : 
                       formData.gender === 'female' ? 'Feminino' : 
                       formData.gender === 'other' ? 'Outro' : 
                       formData.gender || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Responsável</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Nome:</span>
                    <span className="ml-2 text-gray-900">{formData.responsible_name || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Telefone:</span>
                    <span className="ml-2 text-gray-900">{formData.responsible_phone || 'Não informado'}</span>
                  </div>
                </div>

                {formData.observation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Observações</h4>
                    <p className="text-gray-900 whitespace-pre-wrap">{formData.observation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteProfile;

