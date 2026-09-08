import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, ALUNO_ID } from '../firebase/config';

type Chamado = {
  description: string;
  photoUri?: string | null;
  address?: string | null;
  status: string;
};

// Para cada status, quais ações fazem sentido oferecer.
// 'concluido' e 'cancelado' são finais: nenhuma ação.
const ACOES_POR_STATUS: Record<string, { label: string; novoStatus: string; variante: 'iniciar' | 'concluir' | 'cancelar' }[]> = {
  aberto: [
    { label: 'Iniciar Atendimento', novoStatus: 'atendendo', variante: 'iniciar' },
    { label: 'Cancelar Chamado', novoStatus: 'cancelado', variante: 'cancelar' },
  ],
  atendendo: [
    { label: 'Concluir Atendimento', novoStatus: 'concluido', variante: 'concluir' },
  ],
};

export default function CallDetailScreen({ route }: any) {
  const { chamadoId } = route.params;
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function carregarChamado() {
      setLoading(true);
      try {
        const ref = doc(db, 'alunos', ALUNO_ID, 'chamados', chamadoId);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          setChamado(snapshot.data() as Chamado);
        } else {
          Alert.alert('Chamado não encontrado', 'Este chamado não existe mais.');
        }
      } catch (error) {
        console.log('Erro ao carregar chamado', error);
        Alert.alert('Erro', 'Não foi possível carregar o chamado. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    carregarChamado();
  }, [chamadoId]);

  async function mudarStatus(novoStatus: string) {
    setSaving(true);
    try {
      const ref = doc(db, 'alunos', ALUNO_ID, 'chamados', chamadoId);
      // updateDoc altera só o campo "status", sem reescrever o documento inteiro.
      await updateDoc(ref, { status: novoStatus });
      // Atualiza o estado local para a tela refletir a mudança sem novo getDoc.
      setChamado((atual) => (atual ? { ...atual, status: novoStatus } : atual));
    } catch (error) {
      console.log('Erro ao atualizar status', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!chamado) {
    return (
      <View style={styles.center}>
        <Text style={styles.placeholderText}>Chamado não encontrado.</Text>
      </View>
    );
  }

  const acoes = ACOES_POR_STATUS[chamado.status] ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Descrição</Text>
      <Text style={styles.description}>{chamado.description}</Text>

      {chamado.photoUri ? (
        <>
          <Text style={styles.label}>Foto do equipamento</Text>
          <Image source={{ uri: chamado.photoUri }} style={styles.photo} />
        </>
      ) : null}

      {chamado.address ? (
        <>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{chamado.address}</Text>
        </>
      ) : null}

      <Text style={styles.label}>Status atual</Text>
      <Text style={styles.status}>{chamado.status}</Text>

      {saving ? (
        <ActivityIndicator size="large" style={styles.saving} />
      ) : acoes.length > 0 ? (
        <View style={styles.actions}>
          {acoes.map((acao) => (
            <TouchableOpacity
              key={acao.novoStatus}
              style={[styles.button, styles[acao.variante]]}
              onPress={() => mudarStatus(acao.novoStatus)}
            >
              <Text style={styles.buttonText}>{acao.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.finalText}>Chamado finalizado — nenhuma ação disponível.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#999' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#555' },
  description: { fontSize: 16, color: '#222' },
  value: { fontSize: 15, color: '#222' },
  status: { fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', color: '#1565c0' },
  photo: { width: '100%', height: 200, borderRadius: 8 },
  saving: { marginTop: 28 },
  actions: { marginTop: 28, gap: 12 },
  button: { borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  iniciar: { backgroundColor: '#1565c0' },
  concluir: { backgroundColor: '#2e7d32' },
  cancelar: { backgroundColor: '#d32f2f' },
  finalText: { marginTop: 28, color: '#666', textAlign: 'center' },
});
