import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Tab = 'today' | 'log' | 'coach' | 'profile';
type MealType = '早餐' | '午餐' | '晚餐' | '點心';
type HabitKey = 'water' | 'noSugar' | 'sleep';

type Meal = {
  id: string;
  type: MealType;
  note: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUri?: string;
  createdAt: string;
};

type Exercise = {
  id: string;
  name: string;
  minutes: number;
  calories: number;
  createdAt: string;
};

type DayState = {
  weight: string;
  waist: string;
  caloriesGoal: number;
  proteinGoal: number;
  carbGoal: number;
  dayType: '一般日' | '訓練日' | '外食日';
  phase: '紀律' | '穩定' | '修正';
  habits: Record<HabitKey, boolean>;
  meals: Meal[];
  exercises: Exercise[];
};

const STORAGE_KEY = 'planszie:mobile:v1';
const mealTypes: MealType[] = ['早餐', '午餐', '晚餐', '點心'];
const tabs: { id: Tab; label: string }[] = [
  { id: 'today', label: '今天' },
  { id: 'log', label: '記錄' },
  { id: 'coach', label: '教練' },
  { id: 'profile', label: '我的' },
];

const defaultDay: DayState = {
  weight: '99.0',
  waist: '',
  caloriesGoal: 1700,
  proteinGoal: 100,
  carbGoal: 150,
  dayType: '一般日',
  phase: '紀律',
  habits: { water: false, noSugar: false, sleep: false },
  meals: [],
  exercises: [],
};

const makeId = () => `${Date.now()}-${Math.round(Math.random() * 100000)}`;
const numberOrZero = (value: string) => Number(value.replace(/[^\d.]/g, '')) || 0;

function estimateMeal(note: string) {
  const text = note.toLowerCase();
  let calories = 420;
  let protein = 20;
  let carbs = 45;
  let fat = 12;

  if (/雞胸|chicken|蛋白|豆腐|魚|牛/.test(text)) {
    protein += 18;
    calories += 80;
  }
  if (/飯|麵|麵包|粥|rice|noodle|pasta/.test(text)) {
    carbs += 35;
    calories += 160;
  }
  if (/炸|薯|奶茶|甜|蛋糕|餅乾|fried|cake|milk tea/.test(text)) {
    fat += 14;
    carbs += 25;
    calories += 260;
  }
  if (/沙拉|青菜|蔬菜|菜|salad/.test(text)) {
    calories -= 80;
    carbs -= 12;
  }

  return {
    calories: Math.max(120, calories),
    protein: Math.max(5, protein),
    carbs: Math.max(8, carbs),
    fat: Math.max(3, fat),
  };
}

function estimateExercise(name: string, minutes: number) {
  const lower = name.toLowerCase();
  let rate = 6;
  if (/跑|run|hiit|重訓|重量|腿/.test(lower)) rate = 9;
  if (/走|walk|散步|瑜伽|伸展/.test(lower)) rate = 4;
  if (/腳踏車|單車|bike|游泳/.test(lower)) rate = 8;
  return Math.round(minutes * rate);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [day, setDay] = useState<DayState>(defaultDay);
  const [hydrated, setHydrated] = useState(false);
  const [mealType, setMealType] = useState<MealType>('午餐');
  const [mealNote, setMealNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [calorieDraft, setCalorieDraft] = useState('');
  const [proteinDraft, setProteinDraft] = useState('');
  const [carbDraft, setCarbDraft] = useState('');
  const [fatDraft, setFatDraft] = useState('');
  const [exerciseName, setExerciseName] = useState('快走');
  const [exerciseMinutes, setExerciseMinutes] = useState('30');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setDay({ ...defaultDay, ...JSON.parse(saved) });
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(day));
  }, [day, hydrated]);

  const totals = useMemo(() => {
    const food = day.meals.reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const exercise = day.exercises.reduce((sum, item) => sum + item.calories, 0);
    const score =
      (day.habits.water ? 10 : 0) +
      (day.habits.noSugar ? 10 : 0) +
      (day.habits.sleep ? 20 : 0) +
      (day.meals.length ? 20 : 0) +
      (food.protein >= day.proteinGoal ? 20 : 0) +
      (day.exercises.length ? 20 : 0);

    return {
      ...food,
      exercise,
      remaining: day.caloriesGoal - food.calories + exercise,
      score,
    };
  }, [day]);

  const coachCards = useMemo(() => {
    const cards = ['今天先求穩：蛋白質補到位，晚餐不要用意志力硬扛。'];
    if (totals.remaining < 250) cards.push('剩餘熱量偏低，下一餐選高蛋白低油脂，別再加含糖飲。');
    if (totals.protein < day.proteinGoal * 0.6) cards.push('蛋白質還差一段，可以補雞胸、蛋、豆腐、魚或無糖優格。');
    if (!day.exercises.length) cards.push('今天還沒運動，先快走 20 分鐘也算把節奏接住。');
    if (totals.score >= 80) cards.push('今天很漂亮，維持這種可重複的日子就會瘦。');
    return cards;
  }, [day, totals]);

  const todayLabel = new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  const setHabit = (key: HabitKey) => {
    setDay((current) => ({
      ...current,
      habits: { ...current.habits, [key]: !current.habits[key] },
    }));
  };

  const tapKey = (value: string) => {
    if (value === 'C') return setCalorieDraft('');
    if (value === '⌫') return setCalorieDraft((current) => current.slice(0, -1));
    setCalorieDraft((current) => (current + value).slice(0, 4));
  };

  const useEstimate = () => {
    const estimate = estimateMeal(mealNote || '一般餐點');
    setCalorieDraft(String(estimate.calories));
    setProteinDraft(String(estimate.protein));
    setCarbDraft(String(estimate.carbs));
    setFatDraft(String(estimate.fat));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要照片權限', '開啟照片權限後，就可以用餐點照片輔助紀錄。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      if (!mealNote) setMealNote('照片餐點');
    }
  };

  const addMeal = () => {
    const estimate = estimateMeal(mealNote || '一般餐點');
    const meal: Meal = {
      id: makeId(),
      type: mealType,
      note: mealNote.trim() || '未命名餐點',
      calories: numberOrZero(calorieDraft) || estimate.calories,
      protein: numberOrZero(proteinDraft) || estimate.protein,
      carbs: numberOrZero(carbDraft) || estimate.carbs,
      fat: numberOrZero(fatDraft) || estimate.fat,
      photoUri,
      createdAt: new Date().toISOString(),
    };

    setDay((current) => ({ ...current, meals: [meal, ...current.meals] }));
    setMealNote('');
    setPhotoUri(undefined);
    setCalorieDraft('');
    setProteinDraft('');
    setCarbDraft('');
    setFatDraft('');
    setTab('today');
  };

  const addExercise = () => {
    const minutes = Math.max(1, numberOrZero(exerciseMinutes));
    const exercise: Exercise = {
      id: makeId(),
      name: exerciseName.trim() || '運動',
      minutes,
      calories: estimateExercise(exerciseName, minutes),
      createdAt: new Date().toISOString(),
    };
    setDay((current) => ({ ...current, exercises: [exercise, ...current.exercises] }));
    setTab('today');
  };

  const removeMeal = (id: string) => {
    setDay((current) => ({ ...current, meals: current.meals.filter((meal) => meal.id !== id) }));
  };

  const removeExercise = (id: string) => {
    setDay((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== id) }));
  };

  const resetDay = () => {
    Alert.alert('重置今天？', '會清空今天的飲食與運動紀錄。', [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: () => setDay(defaultDay) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.app}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>{todayLabel}</Text>
                <Text style={styles.title}>減脂陪跑</Text>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{totals.score}</Text>
                <Text style={styles.scoreUnit}>分</Text>
              </View>
            </View>

            {tab === 'today' && (
              <View style={styles.stack}>
                <View style={styles.heroCard}>
                  <Text style={styles.cardLabel}>今日摘要</Text>
                  <Text style={styles.heroNumber}>{totals.remaining}</Text>
                  <Text style={styles.muted}>kcal 剩餘</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, (totals.calories / day.caloriesGoal) * 100)}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.quickGrid}>
                    <Metric label="已吃" value={`${totals.calories}`} unit="kcal" />
                    <Metric label="運動" value={`${totals.exercise}`} unit="kcal" />
                    <Metric label="蛋白質" value={`${totals.protein}`} unit={`/ ${day.proteinGoal} g`} />
                    <Metric label="碳水" value={`${totals.carbs}`} unit={`/ ${day.carbGoal} g`} />
                  </View>
                </View>

                <View style={styles.row}>
                  {(['一般日', '訓練日', '外食日'] as DayState['dayType'][]).map((item) => (
                    <Chip key={item} active={day.dayType === item} label={item} onPress={() => setDay({ ...day, dayType: item })} />
                  ))}
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>今天任務</Text>
                  <Habit checked={day.habits.water} label="喝水達標" points="+10" onPress={() => setHabit('water')} />
                  <Habit checked={day.habits.noSugar} label="不喝含糖飲料" points="+10" onPress={() => setHabit('noSugar')} />
                  <Habit checked={day.habits.sleep} label="睡眠/恢復有顧到" points="+20" onPress={() => setHabit('sleep')} />
                </View>

                <ListCard
                  title="飲食紀錄"
                  empty="還沒記餐，先補第一筆。"
                  items={day.meals.map((meal) => ({
                    id: meal.id,
                    title: `${meal.type} · ${meal.note}`,
                    detail: `${meal.calories} kcal · P ${meal.protein} / C ${meal.carbs} / F ${meal.fat}`,
                  }))}
                  onRemove={removeMeal}
                />

                <ListCard
                  title="運動紀錄"
                  empty="今天還沒運動。"
                  items={day.exercises.map((item) => ({
                    id: item.id,
                    title: `${item.name} ${item.minutes} 分`,
                    detail: `消耗 ${item.calories} kcal`,
                  }))}
                  onRemove={removeExercise}
                />
              </View>
            )}

            {tab === 'log' && (
              <View style={styles.stack}>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>新增飲食</Text>
                  <View style={styles.row}>
                    {mealTypes.map((item) => (
                      <Chip key={item} active={mealType === item} label={item} onPress={() => setMealType(item)} />
                    ))}
                  </View>

                  <Pressable style={styles.photoButton} onPress={pickPhoto}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photo} />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoTitle}>選餐點照片</Text>
                        <Text style={styles.muted}>先放入口，下一步可接 AI 辨識</Text>
                      </View>
                    )}
                  </Pressable>

                  <TextInput
                    value={mealNote}
                    onChangeText={setMealNote}
                    placeholder="例如：雞胸便當半碗飯、青菜、蛋"
                    placeholderTextColor="#8b9991"
                    style={[styles.input, styles.textarea]}
                    multiline
                  />
                  <Pressable style={styles.secondaryButton} onPress={useEstimate}>
                    <Text style={styles.secondaryButtonText}>用描述快速估算</Text>
                  </Pressable>

                  <View style={styles.calculator}>
                    <View style={styles.calDisplay}>
                      <Text style={styles.cardLabel}>熱量</Text>
                      <Text style={styles.calDisplayText}>{calorieDraft || '0'} kcal</Text>
                    </View>
                    <View style={styles.keypad}>
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'].map((key) => (
                        <Pressable key={key} style={styles.key} onPress={() => tapKey(key)}>
                          <Text style={styles.keyText}>{key}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.macroRow}>
                    <MacroInput label="蛋白" value={proteinDraft} onChangeText={setProteinDraft} />
                    <MacroInput label="碳水" value={carbDraft} onChangeText={setCarbDraft} />
                    <MacroInput label="脂肪" value={fatDraft} onChangeText={setFatDraft} />
                  </View>

                  <Pressable style={styles.primaryButton} onPress={addMeal}>
                    <Text style={styles.primaryButtonText}>加入今天</Text>
                  </Pressable>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>新增運動</Text>
                  <View style={styles.row}>
                    {['快走', '重訓', '跑步'].map((item) => (
                      <Chip key={item} active={exerciseName === item} label={item} onPress={() => setExerciseName(item)} />
                    ))}
                  </View>
                  <TextInput
                    value={exerciseName}
                    onChangeText={setExerciseName}
                    placeholder="運動名稱"
                    placeholderTextColor="#8b9991"
                    style={styles.input}
                  />
                  <TextInput
                    value={exerciseMinutes}
                    onChangeText={setExerciseMinutes}
                    keyboardType="number-pad"
                    placeholder="分鐘"
                    placeholderTextColor="#8b9991"
                    style={styles.input}
                  />
                  <Pressable style={styles.primaryButton} onPress={addExercise}>
                    <Text style={styles.primaryButtonText}>加入運動</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {tab === 'coach' && (
              <View style={styles.stack}>
                <View style={styles.heroCard}>
                  <Text style={styles.cardLabel}>AI 教練</Text>
                  <Text style={styles.sectionTitle}>今天照這個節奏</Text>
                  {coachCards.map((card) => (
                    <View key={card} style={styles.coachBubble}>
                      <Text style={styles.coachText}>{card}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>下一餐建議</Text>
                  <Text style={styles.bodyText}>
                    優先順序：蛋白質、蔬菜、主食份量、最後才是油脂。外食就選便當/滷味/火鍋，醬另外放。
                  </Text>
                </View>
              </View>
            )}

            {tab === 'profile' && (
              <View style={styles.stack}>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>身體紀錄</Text>
                  <TextInput
                    value={day.weight}
                    onChangeText={(weight) => setDay({ ...day, weight })}
                    keyboardType="decimal-pad"
                    placeholder="體重 kg"
                    placeholderTextColor="#8b9991"
                    style={styles.input}
                  />
                  <TextInput
                    value={day.waist}
                    onChangeText={(waist) => setDay({ ...day, waist })}
                    keyboardType="decimal-pad"
                    placeholder="腰圍 cm"
                    placeholderTextColor="#8b9991"
                    style={styles.input}
                  />
                  <View style={styles.row}>
                    {(['紀律', '穩定', '修正'] as DayState['phase'][]).map((item) => (
                      <Chip key={item} active={day.phase === item} label={item} onPress={() => setDay({ ...day, phase: item })} />
                    ))}
                  </View>
                </View>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>設定</Text>
                  <Setting label="每日熱量" value={String(day.caloriesGoal)} onChangeText={(text) => setDay({ ...day, caloriesGoal: numberOrZero(text) || 1700 })} />
                  <Setting label="蛋白質目標" value={String(day.proteinGoal)} onChangeText={(text) => setDay({ ...day, proteinGoal: numberOrZero(text) || 100 })} />
                  <Setting label="碳水目標" value={String(day.carbGoal)} onChangeText={(text) => setDay({ ...day, carbGoal: numberOrZero(text) || 150 })} />
                  <Pressable style={styles.dangerButton} onPress={resetDay}>
                    <Text style={styles.dangerText}>重置今天</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.tabBar}>
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[styles.tabItem, tab === item.id && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value} <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Habit({ checked, label, points, onPress }: { checked: boolean; label: string; points: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.habit}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.habitText}>{label}</Text>
      <Text style={styles.points}>{points}</Text>
    </Pressable>
  );
}

function MacroInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.macroInput}>
      <Text style={styles.cardLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="0g"
        placeholderTextColor="#8b9991"
        style={styles.macroTextInput}
      />
    </View>
  );
}

function Setting({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.setting}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" style={styles.settingInput} />
    </View>
  );
}

function ListCard({
  title,
  empty,
  items,
  onRemove,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; detail: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>{empty}</Text>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={styles.listItem} onLongPress={() => onRemove(item.id)}>
            <View>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.detail}</Text>
            </View>
            <Text style={styles.removeHint}>長按刪除</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eff3ee',
  },
  keyboard: {
    flex: 1,
  },
  app: {
    flex: 1,
    backgroundColor: '#eff3ee',
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: {
    color: '#66746c',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#24332b',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 2,
  },
  scorePill: {
    alignItems: 'baseline',
    backgroundColor: '#14382b',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  scoreUnit: {
    color: '#a8d9c4',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 3,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2dc',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2dc',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardLabel: {
    color: '#65736b',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#203128',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 12,
  },
  heroNumber: {
    color: '#1f8a68',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 66,
    marginTop: 4,
  },
  muted: {
    color: '#6f7d75',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: '#e8eee9',
    borderRadius: 999,
    height: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1f8a68',
    borderRadius: 999,
    height: '100%',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  metric: {
    backgroundColor: '#f5f7f4',
    borderRadius: 14,
    minWidth: '47%',
    padding: 14,
  },
  metricValue: {
    color: '#213029',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
  },
  metricUnit: {
    color: '#65736b',
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2dc',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  chipActive: {
    backgroundColor: '#14382b',
    borderColor: '#14382b',
  },
  chipText: {
    color: '#2f4037',
    fontSize: 14,
    fontWeight: '900',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  habit: {
    alignItems: 'center',
    borderTopColor: '#edf1ed',
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#9aaaa2',
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 12,
    width: 24,
  },
  checkboxActive: {
    backgroundColor: '#1f8a68',
    borderColor: '#1f8a68',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  habitText: {
    color: '#26352d',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  points: {
    color: '#1f8a68',
    fontSize: 15,
    fontWeight: '900',
  },
  photoButton: {
    borderRadius: 18,
    marginVertical: 12,
    overflow: 'hidden',
  },
  photo: {
    height: 190,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#edf4ef',
    borderColor: '#d4e2da',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 150,
    justifyContent: 'center',
  },
  photoTitle: {
    color: '#1f3a2f',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8faf7',
    borderColor: '#d8e2dc',
    borderRadius: 14,
    borderWidth: 1,
    color: '#213029',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  textarea: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e7f3ed',
    borderRadius: 14,
    marginTop: 10,
    padding: 14,
  },
  secondaryButtonText: {
    color: '#14664f',
    fontSize: 16,
    fontWeight: '900',
  },
  calculator: {
    marginTop: 14,
  },
  calDisplay: {
    backgroundColor: '#14382b',
    borderRadius: 18,
    padding: 16,
  },
  calDisplayText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  key: {
    alignItems: 'center',
    backgroundColor: '#f3f6f2',
    borderColor: '#d8e2dc',
    borderRadius: 18,
    borderWidth: 1,
    height: 68,
    justifyContent: 'center',
    width: '30.7%',
  },
  keyText: {
    color: '#203128',
    fontSize: 28,
    fontWeight: '900',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  macroInput: {
    backgroundColor: '#f8faf7',
    borderColor: '#d8e2dc',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  macroTextInput: {
    color: '#213029',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    minHeight: 38,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f8a68',
    borderRadius: 16,
    marginTop: 14,
    padding: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  coachBubble: {
    backgroundColor: '#f3f7f4',
    borderRadius: 16,
    marginTop: 8,
    padding: 14,
  },
  coachText: {
    color: '#24332b',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  bodyText: {
    color: '#425249',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  listItem: {
    alignItems: 'center',
    borderTopColor: '#edf1ed',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
  },
  listTitle: {
    color: '#23332b',
    fontSize: 15,
    fontWeight: '900',
    maxWidth: 230,
  },
  removeHint: {
    color: '#98a59e',
    fontSize: 11,
    fontWeight: '800',
  },
  setting: {
    alignItems: 'center',
    borderTopColor: '#edf1ed',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  settingLabel: {
    color: '#24332b',
    fontSize: 16,
    fontWeight: '900',
  },
  settingInput: {
    backgroundColor: '#f8faf7',
    borderColor: '#d8e2dc',
    borderRadius: 12,
    borderWidth: 1,
    color: '#213029',
    fontSize: 16,
    fontWeight: '900',
    minHeight: 44,
    paddingHorizontal: 12,
    textAlign: 'right',
    width: 112,
  },
  dangerButton: {
    alignItems: 'center',
    borderColor: '#e3b5ad',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  dangerText: {
    color: '#a33a2b',
    fontSize: 16,
    fontWeight: '900',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2dc',
    borderRadius: 26,
    borderWidth: 1,
    bottom: 16,
    flexDirection: 'row',
    gap: 6,
    left: 16,
    padding: 6,
    position: 'absolute',
    right: 16,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: 20,
    flex: 1,
    paddingVertical: 13,
  },
  tabItemActive: {
    backgroundColor: '#14382b',
  },
  tabText: {
    color: '#5d6b63',
    fontSize: 14,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});
