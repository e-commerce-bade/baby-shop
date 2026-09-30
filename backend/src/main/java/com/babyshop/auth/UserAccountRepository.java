package com.babyshop.auth;

import com.babyshop.common.search.SearchText;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    @EntityGraph(attributePaths = "roles")
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    @Override
    @EntityGraph(attributePaths = "roles")
    Optional<UserAccount> findById(Long id);

    // Yalnizca ADMIN rolundeki hesaplari getirir; musteri hesaplari bu listeye girmez.
    @EntityGraph(attributePaths = "roles")
    @Query("select u from UserAccount u "
            + "where exists (select 1 from u.roles r where upper(r.name) = 'ADMIN') "
            + "order by u.createdAt desc")
    List<UserAccount> findAdmins();

    @Query("select count(distinct u.id) from UserAccount u join u.roles r "
            + "where upper(r.name) = upper(:roleName)")
    long countByRoleName(@Param("roleName") String roleName);

    // CUSTOMER rolundeki kullanicilar icin arama kosulu. :q, SearchText ile sadelestirilmis '%term%'
    // kalibidir (null = arama yok) ve e-posta ile ad soyadin ayni sekilde sadelestirilmis haliyle
    // karsilastirilir; :phone yalnizca rakamlardan olusan '%...%' kalibidir (null = telefon aranmaz).
    // function(...) HQL'de tipsiz doner; LIKE icin string'e cast edilmesi gerekir. ESCAPE acikca
    // yazilir: yazilmazsa kaliptaki kacislar (orn. e-postadaki "_") gecersiz kalir ve sonuc bos doner.
    String CUSTOMER_SEARCH = "where exists (select 1 from u.roles r where upper(r.name) = 'CUSTOMER') "
            + "and (:q is null "
            + "or lower(cast(function('translate', u.email, '" + SearchText.FROM + "', '" + SearchText.TO
            + "') as string)) like :q escape '" + SearchText.LIKE_ESCAPE + "' "
            + "or lower(cast(function('translate', concat(coalesce(u.firstName, ''), ' ', coalesce(u.lastName, '')), '"
            + SearchText.FROM + "', '" + SearchText.TO + "') as string)) like :q escape '" + SearchText.LIKE_ESCAPE + "' "
            + "or (:phone is not null "
            + "and cast(function('regexp_replace', coalesce(u.phoneNumber, ''), '[^0-9]', '', 'g') as string) like :phone))";

    @EntityGraph(attributePaths = "roles")
    @Query(value = "select u from UserAccount u " + CUSTOMER_SEARCH,
            countQuery = "select count(u) from UserAccount u " + CUSTOMER_SEARCH)
    Page<UserAccount> findCustomers(@Param("q") String q, @Param("phone") String phone, Pageable pageable);

    // Genel arama icin ilk birkac eslesme. Rol koleksiyonu fetch edilmez; boylece LIMIT veritabaninda
    // uygulanir (koleksiyon fetch'li sayfali sorguda Hibernate tum eslesenleri bellege alir).
    @Query("select u from UserAccount u " + CUSTOMER_SEARCH)
    List<UserAccount> searchCustomers(@Param("q") String q, @Param("phone") String phone, Pageable pageable);

    @Query("select count(distinct u.id) from UserAccount u "
            + "where exists (select 1 from u.roles r where upper(r.name) = 'CUSTOMER') "
            + "and exists (select 1 from Order o where lower(o.customerEmail) = lower(u.email))")
    long countCustomersWithOrders();
}
