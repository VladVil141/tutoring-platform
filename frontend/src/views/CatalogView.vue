<template>
  <div class="catalog">
    <h1 class="page-title">Каталог занятий</h1>
    
    <!-- Фильтры -->
    <el-card class="filters-card">
      <el-form :inline="true" :model="filters" class="filters-form">
        
        <!-- Переключатель типа -->
        <el-form-item label="Тип занятия">
          <el-radio-group v-model="filters.type" @change="loadListings">
            <el-radio value="all">Все</el-radio>
            <el-radio value="individual">Индивидуальные</el-radio>
            <el-radio value="group">Групповые</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Предмет">
          <el-input 
            v-model="filters.subject" 
            placeholder="Поиск по предмету"
            clearable
            @clear="loadListings"
            @keyup.enter="loadListings"
          />
        </el-form-item>
        
        <el-form-item label="Цена от">
          <el-input-number 
            v-model="filters.minPrice" 
            :min="0" 
            :max="10000"
            placeholder="От"
            style="width: 120px"
            @change="loadListings"
          />
        </el-form-item>
        
        <el-form-item label="до">
          <el-input-number 
            v-model="filters.maxPrice" 
            :min="0" 
            :max="10000"
            placeholder="До"
            style="width: 120px"
            @change="loadListings"
          />
        </el-form-item>
        
        <el-form-item label="Уровень">
          <el-select 
            v-model="filters.level" 
            placeholder="Все уровни" 
            clearable
            style="width: 150px"
            @change="loadListings"
          >
            <el-option label="Школьный" value="school" />
            <el-option label="Университетский" value="university" />
            <el-option label="Любой" value="any" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Формат">
          <el-select 
            v-model="filters.format" 
            placeholder="Все форматы" 
            clearable
            style="width: 150px"
            @change="loadListings"
          >
            <el-option label="Онлайн" value="online" />
            <el-option label="Офлайн" value="offline" />
            <el-option label="Любой" value="any" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="loadListings" :loading="loading">
            Поиск
          </el-button>
          <el-button @click="resetFilters">Сбросить</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Результаты -->
    <div v-loading="loading">
      <el-row :gutter="20" v-if="allListings.length > 0">
        <el-col :span="8" v-for="listing in allListings" :key="listing.id + '-' + listing.type">
          <!-- Индивидуальные карточки -->
          <el-card 
            v-if="listing.type === 'individual'" 
            class="listing-card" 
            shadow="hover" 
            @click="goToDetail(listing.id, 'individual')"
          >
            <div class="listing-header">
              <el-avatar :size="60" :src="listing.tutor?.profile?.avatar_url" style="background: #2c3e50;">
                {{ listing.tutor?.profile?.first_name?.charAt(0) }}{{ listing.tutor?.profile?.last_name?.charAt(0) }}
              </el-avatar>
              <div class="listing-tutor">
                <h3>{{ listing.tutor?.profile?.first_name }} {{ listing.tutor?.profile?.last_name }}</h3>
                <p class="tutor-city">{{ listing.tutor?.profile?.city || 'Город не указан' }}</p>
              </div>
            </div>
            
            <div class="listing-body">
              <div class="listing-type-badge individual">Индивидуальное</div>
              <h2 class="listing-subject">{{ listing.subject }}</h2>
              <p class="listing-description">{{ truncateText(listing.description, 100) }}</p>
              
              <div class="listing-tags">
                <el-tag size="small" type="info">{{ formatLevel(listing.level) }}</el-tag>
                <el-tag size="small" type="success">{{ formatFormat(listing.format) }}</el-tag>
              </div>
              
              <div class="listing-price">
                {{ Number(listing.price).toLocaleString() }} ₽ / час
              </div>
            </div>
          </el-card>
          <!-- Групповые карточки -->
          <el-card 
            v-else
            class="listing-card group-card" 
            shadow="hover" 
            @click="goToDetail(listing.id, 'group')"
          >
          <div class="listing-header">
            <el-avatar :size="60" :src="listing.tutor?.profile?.avatar_url" style="background: #2c3e50;">
              {{ listing.tutor?.profile?.first_name?.charAt(0) }}{{ listing.tutor?.profile?.last_name?.charAt(0) }}
            </el-avatar>
            <div class="listing-tutor">
              <h3>{{ listing.tutor?.profile?.first_name }} {{ listing.tutor?.profile?.last_name }}</h3>
              <p class="tutor-city">{{ listing.tutor?.profile?.city || 'Город не указан' }}</p>
            </div>
          </div>
  
          <div class="listing-body">
            <div class="listing-type-badge group">Групповое</div>
              <h2 class="listing-subject">{{ listing.subject }}</h2>
              <p class="listing-description">{{ truncateText(listing.description, 100) }}</p>
    
              <!-- Поля для группы с проверкой типа -->
              <template v-if="'schedule' in listing">
                <div class="listing-schedule">
                <el-icon><Calendar /></el-icon>
                {{ listing.schedule }}
                </div>
                <div class="listing-students">
                  <el-progress 
                    :percentage="(listing.current_students / listing.max_students) * 100" 
                    :format="() => `${listing.current_students}/${listing.max_students} мест`"
                  />
                </div>
              </template>
    
              <div class="listing-tags">
                <el-tag size="small" type="info">{{ formatLevel(listing.level) }}</el-tag>
                <el-tag size="small" type="success">{{ formatFormat(listing.format) }}</el-tag>
              </div>
    
              <div class="listing-price">
                {{ Number(listing.price).toLocaleString() }} ₽ / час с человека
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-else description="Объявлений не найдено" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useListingStore } from '../stores/listing';
import { useGroupListingStore } from '../stores/groupListing';
import { Calendar } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';

const router = useRouter();
const listingStore = useListingStore();
const groupStore = useGroupListingStore();
const { listings } = storeToRefs(listingStore);
const { listings: groupListings } = storeToRefs(groupStore);
const loading = ref(false);

const filters = ref({
  type: 'all',
  subject: '',
  minPrice: undefined,
  maxPrice: undefined,
  level: '',
  format: ''
});

// Объединяем оба типа с пометкой
const allListings = computed(() => {
  const individual = listings.value.map(l => ({ ...l, type: 'individual' }));
  const group = groupListings.value.map(g => ({ ...g, type: 'group' }));
  
  if (filters.value.type === 'individual') return individual;
  if (filters.value.type === 'group') return group;
  return [...individual, ...group];
});

onMounted(() => {
  loadListings();
});

async function loadListings() {
  loading.value = true;
  
  const params: any = {
    subject: filters.value.subject || undefined,
    level: filters.value.level || undefined,
    format: filters.value.format || undefined,
    minPrice: filters.value.minPrice,
    maxPrice: filters.value.maxPrice
  };
  
  // Загружаем оба типа одновременно
  await Promise.all([
    listingStore.fetchListings(params),
    groupStore.fetchListings(params)
  ]);
  
  loading.value = false;
}

function resetFilters() {
  filters.value = {
    type: 'all',
    subject: '',
    minPrice: undefined,
    maxPrice: undefined,
    level: '',
    format: ''
  };
  loadListings();
}

function formatLevel(level: string) {
  const map: Record<string, string> = {
    school: 'Школа',
    university: 'Университет',
    any: 'Любой'
  };
  return map[level] || level;
}

function formatFormat(format: string) {
  const map: Record<string, string> = {
    online: 'Онлайн',
    offline: 'Офлайн',
    any: 'Любой'
  };
  return map[format] || format;
}

function truncateText(text: string, length: number) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function goToDetail(id: number, type: string) {
  if (type === 'individual') {
    router.push(`/listings/${id}`);
  } else {
    router.push(`/group-listings/${id}`);
  }
}
</script>

<style scoped>
.catalog {
  padding: 20px;
}

.page-title {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.filters-card {
  margin-bottom: 30px;
}

.filters-form {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

/* НОВЫЕ СТИЛИ ДЛЯ ОТСТУПОВ */
.el-row {
  margin: 0 !important;
}

.el-col {
  margin-bottom: 20px;
  padding: 0 10px;
}

.listing-card {
  margin-bottom: 0; /* убираем старый отступ */
  cursor: pointer;
  transition: all 0.3s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.listing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

/* остальные стили без изменений */
.group-card {
  border-left: 4px solid #ff9800;
}

.listing-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.listing-tutor h3 {
  margin: 0 0 5px;
  font-size: 16px;
  color: #2c3e50;
}

.tutor-city {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.listing-body {
  flex: 1;
}

.listing-type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 10px;
}

.listing-type-badge.individual {
  background: #e3f2fd;
  color: #1976d2;
}

.listing-type-badge.group {
  background: #fff3e0;
  color: #ff9800;
}

.listing-subject {
  margin: 0 0 10px;
  font-size: 20px;
  color: #2c3e50;
}

.listing-description {
  color: #666;
  line-height: 1.5;
  margin-bottom: 15px;
}

.listing-schedule {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #ff9800;
  margin-bottom: 10px;
}

.listing-students {
  margin-bottom: 15px;
}

.listing-tags {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.listing-price {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  text-align: right;
}

@media (max-width: 768px) {
  .filters-form {
    flex-direction: column;
  }
  
  .filters-form .el-form-item {
    width: 100%;
    margin-right: 0;
  }
  
  .el-col {
    margin-bottom: 15px;
  }
}
</style>