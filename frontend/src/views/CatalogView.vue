<template>
  <div class="catalog">
    <h1 class="page-title">Каталог репетиторов</h1>
    
    <!-- Фильтры -->
    <el-card class="filters-card">
      <el-form :inline="true" :model="filters" class="filters-form">
        <el-form-item label="Предмет">
          <el-input 
            v-model="filters.subject" 
            placeholder="Поиск по предмету"
            clearable
            @clear="applyFilters"
            @keyup.enter="applyFilters"
          />
        </el-form-item>
        
        <el-form-item label="Цена от">
          <el-input-number 
            v-model="filters.minPrice" 
            :min="0" 
            :max="10000"
            placeholder="От"
            style="width: 120px"
            @change="applyFilters"
          />
        </el-form-item>
        
        <el-form-item label="до">
          <el-input-number 
            v-model="filters.maxPrice" 
            :min="0" 
            :max="10000"
            placeholder="До"
            style="width: 120px"
            @change="applyFilters"
          />
        </el-form-item>
        
        <el-form-item label="Уровень">
          <el-select 
            v-model="filters.level" 
            placeholder="Все уровни" 
            clearable
            style="width: 150px"
            @change="applyFilters"
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
            @change="applyFilters"
          >
            <el-option label="Онлайн" value="online" />
            <el-option label="Офлайн" value="offline" />
            <el-option label="Любой" value="any" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="applyFilters" :loading="loading">
            Поиск
          </el-button>
          <el-button @click="resetFilters">Сбросить</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Результаты -->
    <div v-loading="loading">
      <el-row :gutter="20" v-if="listings.length > 0">
        <el-col :span="8" v-for="listing in listings" :key="listing.id">
          <el-card class="listing-card" shadow="hover" @click="goToDetail(listing.id)">
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
        </el-col>
      </el-row>

      <el-empty v-else description="Объявлений не найдено" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useListingStore } from '../stores/listing';
import { storeToRefs } from 'pinia';

const router = useRouter();
const listingStore = useListingStore();
const { listings, loading } = storeToRefs(listingStore);

const filters = ref({
  subject: '',
  minPrice: undefined,
  maxPrice: undefined,
  level: '',
  format: ''
});

onMounted(() => {
  loadListings();
});

async function loadListings() {
  const params: any = {};
  
  if (filters.value.subject) params.subject = filters.value.subject;
  if (filters.value.minPrice) params.minPrice = filters.value.minPrice;
  if (filters.value.maxPrice) params.maxPrice = filters.value.maxPrice;
  if (filters.value.level) params.level = filters.value.level;
  if (filters.value.format) params.format = filters.value.format;
  
  await listingStore.fetchListings(params);
}

function applyFilters() {
  loadListings();
}

function resetFilters() {
  filters.value = {
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

function goToDetail(id: number) {
  router.push(`/listings/${id}`);
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

.listing-card {
  margin-bottom: 20px;
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

.listing-tags {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.listing-price {
  font-size: 24px;
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
}
</style>